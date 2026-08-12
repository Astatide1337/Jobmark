import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createAuthorizationTransaction } from '@/lib/mcp/auth/authorization-transaction';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  createAuthorizationCode: vi.fn(),
  createConsent: vi.fn(),
  getConsent: vi.fn(),
  resolveClientId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/mcp/auth/provider', () => ({
  createAuthorizationCode: mocks.createAuthorizationCode,
  createConsent: mocks.createConsent,
  getConsent: mocks.getConsent,
  resolveClientId: mocks.resolveClientId,
}));
vi.mock('@/lib/mcp/auth/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: () => '127.0.0.1',
  createRateLimitHeaders: () => ({}),
  RATE_LIMITS: { authorize: { maxRequests: 10, windowMs: 60_000 } },
}));

import { GET, POST } from './route';

const callbackUrl = 'https://claude.ai/api/mcp/auth_callback';
const clientId = 'https://claude.ai/oauth/mcp-oauth-client-metadata';

async function createRequest(
  action: 'allow' | 'deny',
  scope = 'jobmark:read offline_access',
  overrides: Partial<{
    clientId: string;
    redirectUri: string;
    responseType: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    transaction: string;
  }> = {}
) {
  const requestClientId = overrides.clientId ?? clientId;
  const requestRedirectUri = overrides.redirectUri ?? callbackUrl;
  const transaction =
    overrides.transaction ??
    (await createAuthorizationTransaction({
      clientId: requestClientId,
      redirectUri: requestRedirectUri,
      responseType: 'code',
      scope: 'jobmark:read offline_access',
      state: 'test-state',
      codeChallenge: 'A'.repeat(43),
      codeChallengeMethod: 'S256',
      userId: 'user-1',
    }));

  const body = new URLSearchParams({
    client_id: requestClientId,
    redirect_uri: requestRedirectUri,
    response_type: overrides.responseType ?? 'code',
    scope,
    state: 'test-state',
    code_challenge: overrides.codeChallenge ?? 'A'.repeat(43),
    code_challenge_method: overrides.codeChallengeMethod ?? 'S256',
    transaction,
    action,
  });

  return new NextRequest('https://jobmark.example.com/api/auth/mcp/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

describe('MCP authorization consent callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'test-auth-secret-that-is-at-least-32-characters';
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() });
    mocks.resolveClientId.mockResolvedValue({
      client_id: clientId,
      client_name: 'Claude',
      redirect_uris: [callbackUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'jobmark:read offline_access',
      token_endpoint_auth_method: 'none',
    });
    mocks.getConsent.mockResolvedValue('jobmark:read offline_access');
    mocks.createAuthorizationCode.mockResolvedValue({ code: 'authorization-code' });
  });

  it('shows consent again when the client explicitly requests it', async () => {
    const requestUrl = new URL('https://jobmark.example.com/api/auth/mcp/authorize');
    requestUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'jobmark:read offline_access',
      state: 'test-state',
      code_challenge: 'A'.repeat(43),
      code_challenge_method: 'S256',
      prompt: 'consent',
    }).toString();

    const response = await GET(new NextRequest(requestUrl));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/mcp/consent');
    expect(location.searchParams.has('client_name')).toBe(false);
  });

  it('keeps an unauthenticated preview login on the current host', async () => {
    const previousNextAuthUrl = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = 'https://jobmark.app';
    mocks.auth.mockResolvedValue(null);

    try {
      const requestUrl = new URL('https://preview.jobmark.example/api/auth/mcp/authorize');
      requestUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: callbackUrl,
        scope: 'jobmark:read offline_access',
        state: 'test-state',
        code_challenge: 'A'.repeat(43),
        code_challenge_method: 'S256',
      }).toString();

      const response = await GET(new NextRequest(requestUrl));
      const location = new URL(response.headers.get('location') ?? '');

      expect(location.origin).toBe('https://preview.jobmark.example');
      expect(location.pathname).toBe('/api/auth/signin');
      expect(new URL(location.searchParams.get('callbackUrl') ?? '').origin).toBe(
        'https://preview.jobmark.example'
      );
    } finally {
      if (previousNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
      else process.env.NEXTAUTH_URL = previousNextAuthUrl;
    }
  });

  it('encodes state when redirecting malformed requests to the Jobmark error page', async () => {
    const requestUrl = new URL('https://jobmark.example.com/api/auth/mcp/authorize');
    requestUrl.search = new URLSearchParams({
      response_type: 'token',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'jobmark:read offline_access',
      state: 'state with & separators',
      code_challenge: 'A'.repeat(43),
      code_challenge_method: 'S256',
    }).toString();

    const response = await GET(new NextRequest(requestUrl));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/mcp/authorize');
    expect(location.searchParams.get('error')).toBe('invalid_request');
    expect(location.searchParams.get('state')).toBe('state with & separators');
    expect(location.searchParams.has('separators')).toBe(false);
  });

  it('redirects an approved connection as GET and preserves selected permissions', async () => {
    const response = await POST(await createRequest('allow', 'jobmark:read'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${callbackUrl}?code=authorization-code&state=test-state`
    );
    expect(mocks.createConsent).toHaveBeenCalledWith('user-1', clientId, 'jobmark:read');
    expect(mocks.createAuthorizationCode).toHaveBeenCalledWith(
      clientId,
      'user-1',
      callbackUrl,
      'A'.repeat(43),
      'jobmark:read',
      'test-state'
    );
  });

  it('redirects a cancelled connection as GET with an OAuth error', async () => {
    const response = await POST(await createRequest('deny'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${callbackUrl}?error=access_denied&state=test-state`
    );
  });

  it('still redirects a cancellation after every optional permission is deselected', async () => {
    const response = await POST(await createRequest('deny', ''));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${callbackUrl}?error=access_denied&state=test-state`
    );
  });

  it('does not redirect a denied request to an unregistered redirect URI', async () => {
    const forgedRedirectUri = 'https://attacker.example/callback';
    const response = await POST(
      await createRequest('deny', 'jobmark:read', {
        redirectUri: forgedRedirectUri,
        transaction: await createAuthorizationTransaction({
          clientId,
          redirectUri: forgedRedirectUri,
          responseType: 'code',
          scope: 'jobmark:read offline_access',
          state: 'test-state',
          codeChallenge: 'A'.repeat(43),
          codeChallengeMethod: 'S256',
          userId: 'user-1',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('location')).toBeNull();
    expect(mocks.resolveClientId).toHaveBeenCalledWith(clientId);
  });

  it('rejects a forged consent form before creating a code', async () => {
    const transaction = await createAuthorizationTransaction({
      clientId,
      redirectUri: callbackUrl,
      responseType: 'code',
      scope: 'jobmark:read offline_access',
      state: 'test-state',
      codeChallenge: 'A'.repeat(43),
      codeChallengeMethod: 'S256',
      userId: 'user-1',
    });

    const response = await POST(await createRequest('allow', 'jobmark:write', { transaction }));

    expect(response.status).toBe(400);
    expect(mocks.createAuthorizationCode).not.toHaveBeenCalled();
    expect(mocks.createConsent).not.toHaveBeenCalled();
  });

  it('rejects invalid response and PKCE values before a denial redirect', async () => {
    const response = await POST(
      await createRequest('deny', 'jobmark:read', {
        responseType: 'token',
        codeChallenge: 'not-a-pkce-challenge',
        codeChallengeMethod: 'plain',
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('location')).toBeNull();
  });
});
