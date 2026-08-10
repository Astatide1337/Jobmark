import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refreshFindUnique: vi.fn(),
  refreshUpdateMany: vi.fn(),
  accessCreate: vi.fn(),
  refreshCreate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    oAuthRefreshToken: {
      findUnique: mocks.refreshFindUnique,
      updateMany: mocks.refreshUpdateMany,
      delete: vi.fn(),
      create: mocks.refreshCreate,
    },
    oAuthAccessToken: { create: mocks.accessCreate },
  },
}));

import { rotateRefreshToken } from './provider';

describe('refresh token rotation concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.refreshFindUnique.mockResolvedValue({
      tokenHash: 'hashed-refresh-token',
      clientId: 'client-1',
      userId: 'user-1',
      scope: 'jobmark:read',
      familyId: 'family-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      pkceCodeVerifier: null,
    });
    mocks.refreshUpdateMany.mockImplementation(({ where }: { where: { tokenHash?: string } }) =>
      where.tokenHash ? { count: 1 } : { count: 0 }
    );
    mocks.accessCreate.mockResolvedValue({});
    mocks.refreshCreate.mockResolvedValue({});
  });

  it('allows only one concurrent request to mint a token pair', async () => {
    let consumeAttempts = 0;
    mocks.refreshUpdateMany.mockImplementation(({ where }: { where: { tokenHash?: string } }) => {
      if (where.tokenHash) {
        consumeAttempts += 1;
        return Promise.resolve({ count: consumeAttempts === 1 ? 1 : 0 });
      }
      return Promise.resolve({ count: 0 });
    });

    const results = await Promise.all([
      rotateRefreshToken('refresh-token', 'client-1', 'user-1', 'jobmark:read'),
      rotateRefreshToken('refresh-token', 'client-1', 'user-1', 'jobmark:read'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter(result => result === null)).toHaveLength(1);
    expect(mocks.accessCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refreshCreate).toHaveBeenCalledTimes(1);
  });
});
