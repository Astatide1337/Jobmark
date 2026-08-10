import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, revalidatePathMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    userSettings: { findUnique: vi.fn() },
    project: { findFirst: vi.fn() },
    goal: { findFirst: vi.fn() },
    contact: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: authMock, requireUserId: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/project-lock', () => ({
  getLockedProjectIds: vi.fn(),
  buildLockedActivityFilter: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

import { createActivity } from './activities';

describe('cross-tenant relationship protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: 'user-a' } });
    prismaMock.userSettings.findUnique.mockResolvedValue(null);
  });

  it('rejects an activity linked to another user project before writing', async () => {
    const tx = {
      project: { findFirst: vi.fn().mockResolvedValue(null) },
      activity: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
      callback(tx)
    );

    const formData = new FormData();
    formData.set('content', 'This is a sufficiently long activity');
    formData.set('projectId', 'user-b-project');

    const result = await createActivity({ success: false, message: '' }, formData);

    expect(result).toEqual({ success: false, message: 'The selected project is not available' });
    expect(tx.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-b-project', userId: 'user-a' },
      select: { locked: true },
    });
    expect(tx.activity.create).not.toHaveBeenCalled();
  });

});
