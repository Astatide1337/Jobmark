import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppPublicOrigin } from './app-origin';

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalNextAuthUrl;
});

describe('getAppPublicOrigin', () => {
  it('prefers the configured application URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3001';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jobmark.example';
    process.env.NEXTAUTH_URL = 'https://auth.example';

    expect(getAppPublicOrigin(new Request('http://localhost:3001/api/compliance/continue'))).toBe(
      'http://127.0.0.1:3001'
    );
  });

  it('keeps development redirects on the Auth.js host', () => {
    vi.stubEnv('NODE_ENV', 'development');
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jobmark.astatide.com';
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppPublicOrigin(new Request('http://localhost:3000/api/compliance/continue'))).toBe(
      'http://localhost:3000'
    );
  });

  it('uses forwarded host and protocol when configuration is absent', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXTAUTH_URL;

    const request = new Request('http://localhost:3001/api/compliance/continue', {
      headers: {
        host: 'internal:3001',
        'x-forwarded-host': 'jobmark-preview.example, internal:3001',
        'x-forwarded-proto': 'https, http',
      },
    });

    expect(getAppPublicOrigin(request)).toBe('https://jobmark-preview.example');
  });

  it('falls back to the request origin for local requests', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXTAUTH_URL;

    expect(getAppPublicOrigin(new Request('http://127.0.0.1:3001/api/compliance/continue'))).toBe(
      'http://127.0.0.1:3001'
    );
  });
});
