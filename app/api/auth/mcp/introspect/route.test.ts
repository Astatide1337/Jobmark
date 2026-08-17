import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateAccessToken: vi.fn(),
  clientFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { oAuthClient: { findUnique: mocks.clientFindUnique } },
}));
vi.mock('@/lib/mcp/auth/provider', () => ({
  validateAccessToken: mocks.validateAccessToken,
  validateClient: vi.fn(),
  hashToken: vi.fn(),
}));
vi.mock('@/lib/mcp/auth/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() }),
  getClientIp: () => '127.0.0.1',
  createRateLimitHeaders: () => ({}),
  RATE_LIMITS: { introspect: { maxRequests: 10, windowMs: 60_000 } },
}));

import { POST } from './route';

describe('MCP token introspection', () => {
  it('matches public clients by their public client ID', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'internal-client-cuid',
      clientId: 'public-client-id',
      clientSecretHash: null,
    });
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'public-client-id',
      userId: 'user-1',
      scope: 'jobmark:read',
      exp: 2_000_000_000,
      iat: 1_999_999_000,
    });

    const response = await POST(
      new NextRequest('https://jobmark.example.com/api/auth/mcp/introspect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'access-token', client_id: 'public-client-id' }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      active: true,
      client_id: 'public-client-id',
    });
  });
});
