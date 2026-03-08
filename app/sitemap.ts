import type { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/articles';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobmark.app';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const articles = await getAllArticles();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map(article => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: article.updatedAt ?? article.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...articleRoutes];
}
