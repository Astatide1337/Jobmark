const FALLBACK_REDIRECT = '/dashboard';

/**
 * Keep Auth.js redirects on Jobmark. Relative paths are preferred because
 * they continue to work on preview aliases as well as the main site.
 */
export function safeAuthRedirect(value: unknown, fallback = FALLBACK_REDIRECT): string {
  // Backslashes are normalized to forward slashes by URL parsers and browsers.
  // Reject them before accepting a relative path so `/\\evil.example` cannot
  // become a protocol-relative redirect after normalization.
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const target = new URL(value);
    const allowedOrigins = [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]
      .filter(Boolean)
      .map(url => {
        try {
          return new URL(url!).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin));

    return allowedOrigins.includes(target.origin) ? target.toString() : fallback;
  } catch {
    return fallback;
  }
}
