import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateClient: vi.fn(),
  ensureMcpConnection: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  authCodeFindUnique: vi.fn(),
  authCodeDeleteMany: vi.fn(),
  refreshTokenFindUnique: vi.fn(),
  refreshTokenUpdateMany: vi.fn(),
  accessTokenUpdateMany: vi.fn(),
  verifyPKCE: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    oAuthAuthorizationCode: {
      findUnique: mocks.authCodeFindUnique,
      deleteMany: mocks.authCodeDeleteMany,
    },
    oAuthRefreshToken: {
      findUnique: mocks.refreshTokenFindUnique,
      updateMany: mocks.refreshTokenUpdateMany,
    },
    oAuthAccessToken: { updateMany: mocks.accessTokenUpdateMany },
  },
}));

vi.mock('@/lib/mcp/auth/provider', () => ({
  validateClient: mocks.validateClient,
  hashToken: (value: string) => `hash:${value}`,
  ensureMcpConnection: mocks.ensureMcpConnection,
  createAccessToken: mocks.createAccessToken,
  createRefreshToken: mocks.createRefreshToken,
  rotateRefreshToken: mocks.rotateRefreshToken,
}));

vi.mock('@/lib/mcp/auth/crypto', () => ({ verifyPKCE: mocks.verifyPKCE }));

vi.mock('@/lib/mcp/auth/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  }),
  getClientIp: () => '127.0.0.1',
  createRateLimitHeaders: () => ({}),
  RATE_LIMITS: { token: { maxRequests: 10, windowMs: 60_000 } },
}));

import { POST } from './route';

describe('MCP OAuth token exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateClient.mockResolvedValue({ client_id: 'claude-client' });
    mocks.verifyPKCE.mockReturnValue(true);
    mocks.authCodeFindUnique.mockResolvedValue({
      clientId: 'claude-client',
      userId: 'user-1',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: 'challenge',
      scope: 'jobmark:read jobmark:write offline_access',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mocks.createAccessToken.mockResolvedValue({
      token: 'access-token',
      scope: 'jobmark:read jobmark:write offline_access',
      expires_at: Date.now() + 15 * 60_000,
    });
    mocks.createRefreshToken.mockResolvedValue({ token: 'refresh-token' });
    mocks.authCodeDeleteMany.mockResolvedValue({ count: 1 });
  });

  it('persists the MCP connection before returning tokens to Claude', async () => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'claude-client',
      code: 'authorization-code',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: 'verifier',
    });
    const request = new NextRequest('https://jobmark.example.com/api/auth/mcp/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
    });
    expect(mocks.ensureMcpConnection).toHaveBeenCalledWith(
      'claude-client',
      'user-1',
      'jobmark:read jobmark:write offline_access',
      { revokeExistingTokens: true }
    );
    expect(mocks.ensureMcpConnection.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createAccessToken.mock.invocationCallOrder[0]
    );
  });

  it('rejects an authorization code exchange without its PKCE verifier', async () => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'claude-client',
      code: 'authorization-code',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
    });
    const request = new NextRequest('https://jobmark.example.com/api/auth/mcp/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_grant' });
    expect(mocks.verifyPKCE).not.toHaveBeenCalled();
    expect(mocks.authCodeDeleteMany).not.toHaveBeenCalled();
  });

  it('returns invalid_grant when another request consumes the code first', async () => {
    mocks.authCodeDeleteMany.mockResolvedValue({ count: 0 });
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'claude-client',
      code: 'authorization-code',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: 'verifier',
    });
    const response = await POST(
      new NextRequest('https://jobmark.example.com/api/auth/mcp/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_grant' });
    expect(mocks.ensureMcpConnection).not.toHaveBeenCalled();
  });

  it('rejects refresh requests that broaden the original grant', async () => {
    mocks.refreshTokenFindUnique.mockResolvedValue({
      clientId: 'claude-client',
      userId: 'user-1',
      scope: 'jobmark:read   offline_access',
      expiresAt: new Date(Date.now() + 60_000),
      pkceCodeVerifier: null,
    });

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: 'claude-client',
      refresh_token: 'refresh-token',
      scope: 'jobmark:read\tjobmark:destructive',
    });
    const request = new NextRequest('https://jobmark.example.com/api/auth/mcp/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_scope' });
    expect(mocks.rotateRefreshToken).not.toHaveBeenCalled();
  });
});
