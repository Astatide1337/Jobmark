const PUBLIC_URL_PROTOCOLS = new Set(['http:', 'https:']);

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(',')[0]?.trim();
  return firstValue || null;
}

function normalizeOrigin(value: string): string | null {
  try {
    const parsedUrl = new URL(value);
    if (
      !PUBLIC_URL_PROTOCOLS.has(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== '/' ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      return null;
    }

    return parsedUrl.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the public origin used for same-site redirects.
 *
 * Why: Next's internal request URL can be `localhost` behind a local proxy or
 * development server even when the browser reached the app through another
 * host. Redirecting with that internal URL can strand cookies on the original
 * host and make an authenticated request look anonymous.
 */
export function getAppPublicOrigin(request: Request): string {
  // Why: local development can intentionally keep a production site URL in
  // the shared environment file while Auth.js is bound to localhost. Using
  // the Auth.js URL first in development keeps redirects on the same host as
  // the browser session and prevents local E2E runs from escaping to prod.
  const configuredUrls =
    process.env.NODE_ENV === 'development'
      ? [
          process.env.NEXTAUTH_URL,
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.NEXT_PUBLIC_SITE_URL,
        ]
      : [
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.NEXT_PUBLIC_SITE_URL,
          process.env.NEXTAUTH_URL,
        ];

  for (const configuredUrl of configuredUrls) {
    if (!configuredUrl) continue;
    const configuredOrigin = normalizeOrigin(configuredUrl);
    if (configuredOrigin) return configuredOrigin;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ??
    firstHeaderValue(request.headers.get('host'));
  if (!forwardedHost) return requestUrl.origin;

  const forwardedProtocol = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const protocol = forwardedProtocol ?? requestUrl.protocol.replace(/:$/, '');
  return normalizeOrigin(`${protocol}://${forwardedHost}`) ?? requestUrl.origin;
}
