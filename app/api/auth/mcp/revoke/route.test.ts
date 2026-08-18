import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  revokeToken: vi.fn(),
  validateClient: vi.fn(),
  clientFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { oAuthClient: { findUnique: mocks.clientFindUnique } },
}));
vi.mock('@/lib/mcp/auth/provider', () => ({
  revokeToken: mocks.revokeToken,
  validateClient: mocks.validateClient,
  hashToken: vi.fn(),
}));
vi.mock('@/lib/mcp/auth/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() }),
  getClientIp: () => '127.0.0.1',
  createRateLimitHeaders: () => ({}),
  RATE_LIMITS: { token: { maxRequests: 10, windowMs: 60_000 } },
}));

import { POST } from './route';

describe('MCP token revocation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the public client ID when revoking for a public client', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'internal-client-cuid',
      clientId: 'public-client-id',
      clientSecretHash: null,
    });
    mocks.revokeToken.mockResolvedValue(true);

    const response = await POST(
      new NextRequest('https://jobmark.example.com/api/auth/mcp/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'refresh-token', client_id: 'public-client-id' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.revokeToken).toHaveBeenCalledWith('refresh-token', undefined, 'public-client-id');
  });

  it.each([
    ['missing', undefined],
    ['incorrect', 'wrong-secret'],
  ])(
    'rejects %s credentials for confidential clients without revoking',
    async (_label, clientSecret) => {
      mocks.clientFindUnique.mockResolvedValue({
        id: 'internal-client-cuid',
        clientId: 'confidential-client-id',
        clientSecretHash: 'stored-secret-hash',
      });
      mocks.validateClient.mockResolvedValue(null);

      const body: Record<string, string> = {
        token: 'refresh-token',
        client_id: 'confidential-client-id',
      };
      if (clientSecret) body.client_secret = clientSecret;
      const response = await POST(
        new NextRequest('https://jobmark.example.com/api/auth/mcp/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'invalid_client' });
      expect(mocks.revokeToken).not.toHaveBeenCalled();
    }
  );

  it('returns a safe error for malformed input and rejects unsupported hints', async () => {
    const malformed = await POST(
      new NextRequest('https://jobmark.example.com/api/auth/mcp/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      })
    );
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: 'invalid_request' });

    const unsupported = await POST(
      new NextRequest('https://jobmark.example.com/api/auth/mcp/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: 'access-token',
          client_id: 'public-client-id',
          token_type_hint: 'id_token',
        }),
      })
    );
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toEqual({ error: 'unsupported_token_type' });
  });
});
