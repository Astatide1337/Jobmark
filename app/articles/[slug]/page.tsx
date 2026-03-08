import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownRenderer } from '@/components/content/markdown-renderer';
import { getAllArticleSlugs, getArticleBySlug, getRelatedArticles } from '@/lib/articles';
import {
  ArticleHeader,
  ReadingProgress,
  CareerSignalCallout,
  RelatedStories,
} from '../_components/article-detail';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobmark.app';
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article not found | Jobmark',
      description: 'This article is no longer available.',
    };
  }

  const canonical = `${getBaseUrl()}/articles/${article.slug}`;

  return {
    title: `${article.title} | Jobmark`,
    description: article.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article, 3);
  const canonical = `${getBaseUrl()}/articles/${article.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Jobmark',
    },
    mainEntityOfPage: canonical,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <Link
        href="/articles"
        className="text-muted-foreground hover:text-primary mb-6 inline-flex text-sm transition"
      >
        ← Back to articles
      </Link>

      <ArticleHeader article={article} />

      <MarkdownRenderer content={article.content} className="article-prose max-w-none" />

      <CareerSignalCallout variant={article.ctaVariant} />

      <RelatedStories articles={related} title="Related posts" />
    </div>
  );
}
