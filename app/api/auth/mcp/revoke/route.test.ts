import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  revokeToken: vi.fn(),
  clientFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { oAuthClient: { findUnique: mocks.clientFindUnique } },
}));
vi.mock('@/lib/mcp/auth/provider', () => ({
  revokeToken: mocks.revokeToken,
  validateClient: vi.fn(),
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
  it('passes the public client ID when revoking for a public client', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'internal-client-cuid',
      clientId: 'public-client-id',
      clientSecretHash: null,
    });
    mocks.revokeToken.mockResolvedValue(true);

    const response = await POST(new NextRequest('https://jobmark.example.com/api/auth/mcp/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'refresh-token', client_id: 'public-client-id' }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.revokeToken).toHaveBeenCalledWith('refresh-token', undefined, 'public-client-id');
  });
});
