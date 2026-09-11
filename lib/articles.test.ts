import { describe, expect, it } from 'vitest';
import { getAllArticles, getArticleBySlug } from './articles';

describe('article content', () => {
  it('loads published article summaries without duplicate slugs', async () => {
    const articles = await getAllArticles();
    const slugs = articles.map(article => article.slug);

    expect(articles.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain('connect-jobmark-to-ai');
  });

  it('returns a missing article for invalid or unknown slugs', async () => {
    await expect(getArticleBySlug('does-not-exist')).resolves.toBeNull();
    await expect(getArticleBySlug('../README')).resolves.toBeNull();
  });

  it('parses a valid article by slug', async () => {
    const article = await getArticleBySlug('connect-jobmark-to-ai');

    expect(article).toMatchObject({
      slug: 'connect-jobmark-to-ai',
      title: 'Connect an assistant to Jobmark',
      publishedAt: '2026-08-09',
    });
    expect(article?.content).toContain(
      'Keep your notes in one place. Connect an assistant you already use'
    );
  });
});
