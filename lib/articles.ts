import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const contentDirectory = path.join(process.cwd(), 'content', 'articles');

export const articleCategorySchema = z.enum(['help', 'career-development']);
const articleDifficultySchema = z.enum(['starter', 'intermediate', 'advanced']);

const articleFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publishedAt: z.union([z.string().min(1), z.date()]),
  updatedAt: z.union([z.string().min(1), z.date()]).optional(),
  category: articleCategorySchema,
  tags: z.array(z.string().min(1)).default([]),
  author: z.string().default('Jobmark'),
  draft: z.boolean().default(false),
  coverImage: z.string().optional(),
  featured: z.boolean().default(false),
  heroTone: z.string().min(1).optional(),
  ctaVariant: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  difficulty: articleDifficultySchema.optional().default('starter'),
  bestFor: z.string().min(1).optional(),
  primaryAction: z.string().min(1).optional(),
  primaryHref: z.string().min(1).optional(),
  secondaryAction: z.string().min(1).optional(),
  secondaryHref: z.string().min(1).optional(),
});

export type ArticleCategory = z.infer<typeof articleCategorySchema>;
export type ArticleDifficulty = z.infer<typeof articleDifficultySchema>;

export interface ArticleSummary {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  category: ArticleCategory;
  tags: string[];
  author: string;
  draft: boolean;
  coverImage?: string;
  featured: boolean;
  heroTone?: string;
  ctaVariant?: string;
  series?: string;
  difficulty?: ArticleDifficulty;
  bestFor?: string;
  primaryAction?: string;
  primaryHref?: string;
  secondaryAction?: string;
  secondaryHref?: string;
  readingTimeMinutes: number;
}

export interface Article extends ArticleSummary {
  content: string;
}

const includeDrafts = process.env.NODE_ENV !== 'production';

function toISODate(input: string | Date, fieldName: string, filePath: string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName} in ${filePath}: ${input}`);
  }
  return date.toISOString();
}

function estimateReadingTimeMinutes(markdown: string): number {
  const words = markdown
    .replace(/[#_*`>\-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function toSummary(article: Article): ArticleSummary {
  const { content: _content, ...summary } = article;
  return summary;
}

async function getArticleFileNames(): Promise<string[]> {
  const files = await readdir(contentDirectory, { withFileTypes: true });
  return files
    .filter(
      file =>
        file.isFile() &&
        file.name.endsWith('.md') &&
        file.name !== 'README.md' &&
        !file.name.startsWith('_')
    )
    .map(file => file.name)
    .sort((a, b) => a.localeCompare(b));
}

async function parseArticleFile(fileName: string): Promise<Article> {
  const fullPath = path.join(contentDirectory, fileName);
  const raw = await readFile(fullPath, 'utf8');
  const parsed = matter(raw);
  const frontmatter = articleFrontmatterSchema.parse(parsed.data);

  const slugFromFileName = fileName.replace(/\.md$/, '');
  if (frontmatter.slug !== slugFromFileName) {
    throw new Error(
      `Slug mismatch in ${fullPath}. Frontmatter slug \"${frontmatter.slug}\" must match file name \"${slugFromFileName}\".`
    );
  }

  return {
    ...frontmatter,
    publishedAt: toISODate(frontmatter.publishedAt, 'publishedAt', fullPath),
    updatedAt: frontmatter.updatedAt
      ? toISODate(frontmatter.updatedAt, 'updatedAt', fullPath)
      : undefined,
    readingTimeMinutes: estimateReadingTimeMinutes(parsed.content),
    content: parsed.content,
  };
}

export async function getAllArticles(): Promise<ArticleSummary[]> {
  const fileNames = await getArticleFileNames();
  const articles = await Promise.all(fileNames.map(parseArticleFile));

  return articles
    .filter(article => (includeDrafts ? true : !article.draft))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(toSummary);
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const articles = await getAllArticles();
  return articles.map(article => article.slug);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const filePath = path.join(contentDirectory, `${slug}.md`);

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const frontmatter = articleFrontmatterSchema.parse(parsed.data);

    if (frontmatter.slug !== slug) {
      throw new Error(
        `Slug mismatch in ${filePath}. Frontmatter slug \"${frontmatter.slug}\" must match path slug \"${slug}\".`
      );
    }

    if (!includeDrafts && frontmatter.draft) {
      return null;
    }

    return {
      ...frontmatter,
      publishedAt: toISODate(frontmatter.publishedAt, 'publishedAt', filePath),
      updatedAt: frontmatter.updatedAt
        ? toISODate(frontmatter.updatedAt, 'updatedAt', filePath)
        : undefined,
      readingTimeMinutes: estimateReadingTimeMinutes(parsed.content),
      content: parsed.content,
    };
  } catch (error) {
    // Any error means this slug doesn't represent a valid article
    // Treat as non-existent so Next.js renders 404
    return null;
  }
}

export async function getRelatedArticles(
  article: Pick<Article, 'slug' | 'category' | 'tags'>,
  limit = 3
): Promise<ArticleSummary[]> {
  const all = await getAllArticles();

  const scored = all
    .filter(candidate => candidate.slug !== article.slug)
    .map(candidate => {
      const categoryScore = candidate.category === article.category ? 2 : 0;
      const sharedTags = candidate.tags.filter(tag => article.tags.includes(tag)).length;
      const score = categoryScore + sharedTags;
      return { candidate, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (
        new Date(b.candidate.publishedAt).getTime() - new Date(a.candidate.publishedAt).getTime()
      );
    })
    .slice(0, limit)
    .map(item => item.candidate);

  if (scored.length === limit) {
    return scored;
  }

  const fallback = all
    .filter(
      candidate =>
        candidate.slug !== article.slug && !scored.some(result => result.slug === candidate.slug)
    )
    .slice(0, limit - scored.length);

  return [...scored, ...fallback];
}
