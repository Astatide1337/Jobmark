import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { authMock, requireUserIdMock, getLockedProjectIdsMock, revalidatePathMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    requireUserIdMock: vi.fn(),
    getLockedProjectIdsMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  })
);

vi.mock('@/lib/auth', () => ({ auth: authMock, requireUserId: requireUserIdMock }));
vi.mock('@/lib/project-lock', () => ({
  getLockedProjectIds: getLockedProjectIdsMock,
  buildLockedActivityFilter: vi.fn((ids: string[]) =>
    ids.length ? { projectId: { notIn: ids } } : {}
  ),
  filterLockedReports: vi.fn((reports: unknown[]) => reports),
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

import { prisma } from '@/lib/db';
import { createActivity, getActivities, getActivityStats } from './activities';
import { getProjects } from './projects';
import { getGoals } from './goals';
import { getContacts } from './network';
import { getReports } from './reports';
import { getConversations } from './chat';
import { getUserSettings } from './settings';

const integrationEnabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!integrationEnabled)('PostgreSQL tenant isolation', () => {
  let userA: { id: string };
  let userB: { id: string };
  let projectA: { id: string };
  let privateProjectA: { id: string };
  let projectB: { id: string };

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    userA = await prisma.user.create({ data: { email: `tenant-a-${suffix}@example.test` } });
    userB = await prisma.user.create({ data: { email: `tenant-b-${suffix}@example.test` } });
    projectA = await prisma.project.create({ data: { userId: userA.id, name: 'User A project' } });
    privateProjectA = await prisma.project.create({
      data: { userId: userA.id, name: 'User A private project', locked: true },
    });
    projectB = await prisma.project.create({ data: { userId: userB.id, name: 'User B project' } });
    const [goalA, goalB, contactA, contactB, reportA, reportB] = await Promise.all([
      prisma.goal.create({ data: { userId: userA.id, title: 'User A goal' } }),
      prisma.goal.create({ data: { userId: userB.id, title: 'User B goal' } }),
      prisma.contact.create({ data: { userId: userA.id, fullName: 'User A contact' } }),
      prisma.contact.create({ data: { userId: userB.id, fullName: 'User B contact' } }),
      prisma.report.create({
        data: { userId: userA.id, title: 'User A report', content: 'A report' },
      }),
      prisma.report.create({
        data: { userId: userB.id, title: 'User B report', content: 'B report' },
      }),
    ]);
    await Promise.all([
      prisma.userSettings.create({ data: { userId: userA.id } }),
      prisma.userSettings.create({ data: { userId: userB.id } }),
      prisma.conversation.create({
        data: {
          userId: userA.id,
          title: 'User A conversation',
          projectId: projectA.id,
          goalId: goalA.id,
          contactId: contactA.id,
          reports: { connect: { id: reportA.id } },
        },
      }),
      prisma.conversation.create({
        data: {
          userId: userB.id,
          title: 'User B conversation',
          projectId: projectB.id,
          goalId: goalB.id,
          contactId: contactB.id,
          reports: { connect: { id: reportB.id } },
        },
      }),
    ]);
    await prisma.activity.createMany({
      data: [
        {
          userId: userA.id,
          content: 'User A private activity',
          logDate: new Date('2026-07-12T00:00:00.000Z'),
        },
        {
          userId: userA.id,
          projectId: privateProjectA.id,
          content: 'User A locked activity',
          logDate: new Date('2026-07-12T00:00:00.000Z'),
        },
        {
          userId: userB.id,
          projectId: projectB.id,
          content: 'User B private activity',
          logDate: new Date('2026-07-12T00:00:00.000Z'),
        },
        {
          userId: userA.id,
          content: 'User A future activity',
          logDate: new Date('2099-01-01T00:00:00.000Z'),
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    getLockedProjectIdsMock.mockResolvedValue([]);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  });

  it('returns only the authenticated tenant activity rows', async () => {
    requireUserIdMock.mockResolvedValue(userA.id);

    const activities = await getActivities();

    expect(activities.map(activity => activity.content)).toEqual([
      'User A private activity',
      'User A locked activity',
      'User A future activity',
    ]);
  });

  it('hides locked-project activities when the vault is closed', async () => {
    requireUserIdMock.mockResolvedValue(userA.id);
    getLockedProjectIdsMock.mockResolvedValue([privateProjectA.id]);

    const activities = await getActivities();
    const visibleProjects = await getProjects();

    expect(activities.map(activity => activity.content)).toEqual([
      'User A private activity',
      'User A future activity',
    ]);
    expect(visibleProjects.map(project => project.name)).toEqual(['User A project']);
    getLockedProjectIdsMock.mockResolvedValue([]);
  });

  it('keeps future activities out of the current monthly dashboard count', async () => {
    requireUserIdMock.mockResolvedValue(userA.id);
    getLockedProjectIdsMock.mockResolvedValue([]);

    const stats = await getActivityStats();

    expect(stats.thisMonth).toBe(2);
  });

  it('scopes projects, goals, contacts, reports, conversations, and settings', async () => {
    requireUserIdMock.mockResolvedValue(userA.id);
    authMock.mockResolvedValue({ user: { id: userA.id } });

    const [projects, goals, contacts, reports, conversations, settings] = await Promise.all([
      getProjects(),
      getGoals(),
      getContacts(),
      getReports(),
      getConversations(),
      getUserSettings(),
    ]);

    expect(projects.map(project => project.name)).toEqual([
      'User A private project',
      'User A project',
    ]);
    expect(goals.map(goal => goal.title)).toEqual(['User A goal']);
    expect(contacts.map(contact => contact.fullName)).toEqual(['User A contact']);
    expect(reports.map(report => report.title)).toEqual(['User A report']);
    expect(conversations.map(conversation => conversation.title)).toEqual(['User A conversation']);
    expect(settings?.aiProvider).toBe('gemini');
  });

  it('rejects a cross-tenant project link before persisting an activity', async () => {
    authMock.mockResolvedValue({ user: { id: userA.id } });
    const formData = new FormData();
    formData.set('content', 'Attempted cross tenant link');
    formData.set('projectId', projectB.id);

    const result = await createActivity({ success: false, message: '' }, formData);

    expect(result).toEqual({ success: false, message: 'The selected project is not available' });
    expect(
      await prisma.activity.findFirst({ where: { userId: userA.id, projectId: projectB.id } })
    ).toBeNull();
  });
});
