import { describe, expect, it } from 'vitest';

import { getSecurityHeaders } from './security-headers';

describe('security response headers', () => {
  it('returns compatible baseline headers without HSTS for non-TLS environments', () => {
    const headers = Object.fromEntries(
      getSecurityHeaders().map(header => [header.key, header.value])
    );

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBe('camera=(), geolocation=(), microphone=(self)');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('adds HSTS only when the deployment is known to use TLS', () => {
    const headers = Object.fromEntries(
      getSecurityHeaders(true).map(header => [header.key, header.value])
    );

    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });
});
