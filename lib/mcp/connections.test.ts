import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  connectionUpdateMany: vi.fn(),
  accessTokenUpdateMany: vi.fn(),
  refreshTokenUpdateMany: vi.fn(),
  authorizationCodeDeleteMany: vi.fn(),
  consentDeleteMany: vi.fn(),
  idempotencyDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  prisma: {
    mcpConnection: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      updateMany: mocks.connectionUpdateMany,
    },
    oAuthAccessToken: { updateMany: mocks.accessTokenUpdateMany },
    oAuthRefreshToken: { updateMany: mocks.refreshTokenUpdateMany },
    oAuthAuthorizationCode: { deleteMany: mocks.authorizationCodeDeleteMany },
    oAuthConsent: { deleteMany: mocks.consentDeleteMany },
    mcpIdempotency: { deleteMany: mocks.idempotencyDeleteMany },
    $transaction: mocks.transaction,
  },
}));

import { revokeMcpConnectionForUser } from './connections';

describe('revokeMcpConnectionForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockResolvedValue([]);
  });

  it('returns false when the connection is not active and owned by the user', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(revokeMcpConnectionForUser('connection-1', 'user-1')).resolves.toBe(false);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('revokes duplicate registrations, tokens, consent, and retry records together', async () => {
    const connections = [
      {
        id: 'gemini-1',
        clientName: 'Google',
        oauthClient: {
          clientId: 'google-client-1',
          clientName: 'Google',
          redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
        },
      },
      {
        id: 'gemini-2',
        clientName: 'Gemini',
        oauthClient: {
          clientId: 'google-client-2',
          clientName: 'Gemini',
          redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
        },
      },
      {
        id: 'claude-1',
        clientName: 'Claude',
        oauthClient: {
          clientId: 'claude-client',
          clientName: 'Claude',
          redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        },
      },
    ];
    mocks.findFirst.mockResolvedValue(connections[0]);
    mocks.findMany.mockResolvedValue(connections);

    await expect(revokeMcpConnectionForUser('gemini-1', 'user-1')).resolves.toBe(true);

    expect(mocks.connectionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['gemini-1', 'gemini-2'] }, userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date), vaultUnlockedUntil: null },
    });
    expect(mocks.accessTokenUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['google-client-1', 'google-client-2'] },
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['google-client-1', 'google-client-2'] },
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
    expect(mocks.authorizationCodeDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['google-client-1', 'google-client-2'] },
      },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('does not revoke a same-named client with unrelated trusted identity', async () => {
    const connections = [
      {
        id: 'gemini-1',
        clientName: 'Gemini',
        oauthClient: {
          clientId: 'gemini-client',
          clientName: 'Gemini',
          redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
        },
      },
      {
        id: 'attacker-1',
        clientName: 'Gemini',
        oauthClient: {
          clientId: 'attacker-client',
          clientName: 'Gemini',
          redirectUris: ['https://attacker.example/callback'],
        },
      },
    ];
    mocks.findFirst.mockResolvedValue(connections[0]);
    mocks.findMany.mockResolvedValue(connections);

    await expect(revokeMcpConnectionForUser('gemini-1', 'user-1')).resolves.toBe(true);

    expect(mocks.connectionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['gemini-1'] }, userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date), vaultUnlockedUntil: null },
    });
    expect(mocks.accessTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: { in: ['gemini-client'] }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
