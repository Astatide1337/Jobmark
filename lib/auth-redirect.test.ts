import { afterEach, describe, expect, it } from 'vitest';
import { safeAuthRedirect } from './auth-redirect';

const originalNextAuthUrl = process.env.NEXTAUTH_URL;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalNextAuthUrl;

  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe('safeAuthRedirect', () => {
  it('accepts relative paths', () => {
    expect(safeAuthRedirect('/settings/connections?connect=claude')).toBe(
      '/settings/connections?connect=claude'
    );
  });

  it('accepts an absolute URL on a configured Jobmark origin', () => {
    process.env.NEXTAUTH_URL = 'https://jobmark.example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.jobmark.example.com';

    expect(
      safeAuthRedirect('https://jobmark.example.com/settings/connections?connect=claude')
    ).toBe('https://jobmark.example.com/settings/connections?connect=claude');
    expect(safeAuthRedirect('https://www.jobmark.example.com/dashboard')).toBe(
      'https://www.jobmark.example.com/dashboard'
    );
  });

  it.each([
    ['protocol-relative', '//evil.example.com/phishing'],
    ['backslash protocol-relative', '/\\evil.example.com/phishing'],
    ['backslash network path', '\\\\evil.example.com/phishing'],
    ['external', 'https://evil.example.com/phishing'],
    ['malformed', 'https://[not-a-valid-host'],
  ])('rejects %s redirect values', (_label, value) => {
    process.env.NEXTAUTH_URL = 'https://jobmark.example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.jobmark.example.com';

    expect(safeAuthRedirect(value)).toBe('/dashboard');
  });
});
