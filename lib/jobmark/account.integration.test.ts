import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import type { McpActor } from '@/lib/mcp/actor';
import { clearActivities } from './account';

const integrationEnabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!integrationEnabled)('clearing all notes respects the vault', () => {
  const userId = randomUUID();
  const publicProjectId = `${userId}-public`;
  const privateProjectId = `${userId}-private`;

  const lockedActor: McpActor = {
    userId,
    source: 'mcp',
    connectionId: 'clear-locked',
    clientId: 'clear-client',
    scopes: ['jobmark:read', 'jobmark:write', 'jobmark:destructive'],
    vaultUnlocked: false,
    vaultUnlockedUntil: null,
    requestId: randomUUID(),
  };
  const unlockedActor: McpActor = {
    ...lockedActor,
    connectionId: 'clear-unlocked',
    vaultUnlocked: true,
    vaultUnlockedUntil: new Date(Date.now() + 60_000),
    requestId: randomUUID(),
  };

  async function seedNotes() {
    await prisma.activity.createMany({
      data: [
        { userId, content: 'No project', logDate: new Date('2026-09-12T00:00:00.000Z') },
        {
          userId,
          projectId: publicProjectId,
          content: 'Public project',
          logDate: new Date('2026-09-12T00:00:00.000Z'),
        },
        {
          userId,
          projectId: privateProjectId,
          content: 'Private project',
          logDate: new Date('2026-09-12T00:00:00.000Z'),
        },
      ],
    });
  }

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `clear-${userId}@example.test` } });
    await prisma.project.createMany({
      data: [
        { id: publicProjectId, userId, name: 'Public' },
        { id: privateProjectId, userId, name: 'Private', locked: true },
      ],
    });
  });

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.project.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it('keeps notes in locked projects while the vault is closed', async () => {
    await seedNotes();

    const { deletedCount } = await clearActivities(lockedActor, {
      confirmation: 'DELETE ALL MY NOTES',
    });

    expect(deletedCount).toBe(2);
    const remaining = await prisma.activity.findMany({ where: { userId } });
    expect(remaining.map(activity => activity.projectId)).toEqual([privateProjectId]);
  });

  it('clears every note once the vault is open', async () => {
    await prisma.activity.deleteMany({ where: { userId } });
    await seedNotes();

    const { deletedCount } = await clearActivities(unlockedActor, {
      confirmation: 'DELETE ALL MY NOTES',
    });

    expect(deletedCount).toBe(3);
    expect(await prisma.activity.count({ where: { userId } })).toBe(0);
  });
});
