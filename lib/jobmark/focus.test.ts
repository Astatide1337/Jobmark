import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createDecompressionLog } = vi.hoisted(() => ({
  createDecompressionLog: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    decompressionLog: {
      create: createDecompressionLog,
    },
  },
}));

import { logDecompression } from './focus';

const actor = {
  userId: 'user-1',
  source: 'mcp' as const,
  vaultUnlocked: false,
  requestId: 'request-1',
};

describe('focus domain functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a decompression log for the authenticated actor', async () => {
    const createdAt = new Date('2026-08-11T12:34:56.000Z');
    createDecompressionLog.mockResolvedValue({ id: 'decomp-1', createdAt });

    await expect(
      logDecompression(actor, {
        durationMinutes: 20,
        moodBefore: 4,
        moodAfter: 8,
        notes: 'Walked outside',
      })
    ).resolves.toEqual({ id: 'decomp-1', createdAt: createdAt.toISOString() });

    expect(createDecompressionLog).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        durationMinutes: 20,
        moodBefore: 4,
        moodAfter: 8,
        notes: 'Walked outside',
      },
      select: { id: true, createdAt: true },
    });
  });

  it('rejects an invalid decompression log without writing', async () => {
    await expect(
      logDecompression(actor, {
        durationMinutes: 0,
        moodBefore: 4,
        moodAfter: 8,
        notes: null,
      })
    ).rejects.toThrow('Validation failed');

    expect(createDecompressionLog).not.toHaveBeenCalled();
  });
});
