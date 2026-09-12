import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { mcpIdempotency: mocks } }));

import { claimIdempotency, completeIdempotency, releaseIdempotency } from './idempotency';

const key = {
  connectionId: 'connection-1',
  toolName: 'activity_create',
  requestKey: 'request-1',
  requestHash: 'hash-1',
};

describe('MCP idempotency claims', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atomically reserves the first request', async () => {
    mocks.create.mockResolvedValue({ id: 'claim-1' });
    await expect(claimIdempotency(key)).resolves.toEqual({ kind: 'owner' });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ...key, status: 'pending' }),
    });
  });

  it('returns the completed result after a concurrent request wins the claim', async () => {
    mocks.create.mockRejectedValue({ code: 'P2002' });
    mocks.findUnique
      .mockResolvedValueOnce({
        status: 'pending',
        requestHash: key.requestHash,
        resultJson: null,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        status: 'completed',
        requestHash: key.requestHash,
        resultJson: { content: [{ type: 'text', text: 'created' }] },
        expiresAt: new Date(Date.now() + 60_000),
      });

    await expect(claimIdempotency(key)).resolves.toEqual({
      kind: 'cached',
      result: { content: [{ type: 'text', text: 'created' }] },
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('completes successful claims and releases failed ones', async () => {
    mocks.update.mockResolvedValue({});
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    await completeIdempotency(key, { ok: true });
    await releaseIdempotency(key);
    expect(mocks.update).toHaveBeenCalledWith({
      where: {
        connectionId_toolName_requestKey: {
          connectionId: key.connectionId,
          toolName: key.toolName,
          requestKey: key.requestKey,
        },
      },
      data: { status: 'completed', resultJson: { ok: true } },
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        connectionId: key.connectionId,
        toolName: key.toolName,
        requestKey: key.requestKey,
        status: 'pending',
      },
    });
  });

  it('rejects reuse of a key with different arguments', async () => {
    mocks.create.mockRejectedValue({ code: 'P2002' });
    mocks.findUnique.mockResolvedValue({
      status: 'completed',
      requestHash: 'different-hash',
      resultJson: { ok: true },
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(claimIdempotency(key)).resolves.toEqual({ kind: 'conflict' });
  });

  it('does not replay legacy claims that were not bound to arguments', async () => {
    mocks.create.mockRejectedValue({ code: 'P2002' });
    mocks.findUnique.mockResolvedValue({
      status: 'completed',
      requestHash: null,
      resultJson: { ok: true },
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(claimIdempotency(key)).resolves.toEqual({ kind: 'conflict' });
  });
});
