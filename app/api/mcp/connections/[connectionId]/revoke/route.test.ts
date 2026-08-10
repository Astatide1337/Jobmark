import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), revoke: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/mcp/connections', () => ({ revokeMcpConnectionForUser: mocks.revoke }));

import { POST } from './route';

describe('POST /api/mcp/connections/:connectionId/revoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(new Request('https://jobmark.example.com'), {
      params: Promise.resolve({ connectionId: 'connection-1' }),
    });
    expect(response.status).toBe(401);
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it('revokes only a connection owned by the signed-in user', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.revoke.mockResolvedValue(true);
    const response = await POST(new Request('https://jobmark.example.com'), {
      params: Promise.resolve({ connectionId: 'connection-1' }),
    });
    expect(response.status).toBe(204);
    expect(mocks.revoke).toHaveBeenCalledWith('connection-1', 'user-1');
  });

  it("does not reveal another user's connection", async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.revoke.mockResolvedValue(false);
    const response = await POST(new Request('https://jobmark.example.com'), {
      params: Promise.resolve({ connectionId: 'connection-2' }),
    });
    expect(response.status).toBe(404);
  });
});
