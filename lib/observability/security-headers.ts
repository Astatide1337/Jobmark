export type SecurityHeader = {
  key: string;
  value: string;
};

/**
 * Headers that improve browser and proxy defaults without requiring a CSP.
 *
 * Why: this app contains OAuth redirects and third-party browser integrations;
 * a CSP needs an application-wide inventory of those sources before enabling
 * it safely. These headers are compatible with the current app.
 */
export function getSecurityHeaders(includeHsts = false): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ];

  if (includeHsts) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}
