import type { MetadataRoute } from 'next';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobmark.astatide.com';
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
