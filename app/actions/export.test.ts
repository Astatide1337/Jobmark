import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, getLockedProjectIdsMock, isVaultUnlockedMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getLockedProjectIdsMock: vi.fn(),
  isVaultUnlockedMock: vi.fn(),
  prismaMock: {
    user: { findUnique: vi.fn() },
    project: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    report: { findMany: vi.fn() },
    userSettings: { findUnique: vi.fn() },
    goal: { findMany: vi.fn() },
    contact: { findMany: vi.fn() },
    interactionLog: { findMany: vi.fn() },
    outreachDraft: { findMany: vi.fn() },
    conversation: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: authMock, requireUserId: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/project-lock', () => ({
  getLockedProjectIds: getLockedProjectIdsMock,
  isVaultUnlocked: isVaultUnlockedMock,
  filterLockedReports: vi.fn((reports: unknown[]) => reports),
}));

import { exportUserData } from './settings';

describe('account export safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: 'user-a' } });
    getLockedProjectIdsMock.mockResolvedValue([]);
    isVaultUnlockedMock.mockResolvedValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      name: 'User A',
      email: 'a@example.test',
      createdAt: new Date(),
    });
    prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.activity.findMany.mockResolvedValue([]);
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.userSettings.findUnique.mockResolvedValue({
      primaryGoal: null,
      goalDeadline: null,
      whyStatement: null,
      dailyTarget: 1,
      weeklyTarget: 10,
      monthlyTarget: 40,
      defaultTone: 'professional',
      customInstructions: null,
      themePreset: 'cafe',
      themeMode: 'dark',
      timeZone: 'America/New_York',
      hideArchived: false,
      showConfetti: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.goal.findMany.mockResolvedValue([]);
    prismaMock.contact.findMany.mockResolvedValue([]);
    prismaMock.interactionLog.findMany.mockResolvedValue([]);
    prismaMock.outreachDraft.findMany.mockResolvedValue([]);
    prismaMock.conversation.findMany.mockResolvedValue([]);
  });

  it('does not serialize prohibited security fields', async () => {
    const exported = await exportUserData();
    const serialized = JSON.stringify(exported);

    expect(serialized).not.toMatch(/vaultPasswordHash|access_token|refresh_token|sessionToken|ciphertext/i);
    expect(prismaMock.userSettings.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a' },
        select: expect.not.objectContaining({
          vaultPasswordHash: expect.anything(),
        }),
      })
    );
  });
});
