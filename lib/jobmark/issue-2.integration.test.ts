import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import type { McpActor } from '@/lib/mcp/actor';
import { getDashboardStats, getInsights } from './insights';
import { listActivities, updateActivity } from './activities';
import { listContacts } from './contacts';
import { deleteGoal, listGoals } from './goals';
import { deleteProject, getProject, getProjectWithActivities, listProjects } from './projects';
import { generateReport, getReport, listReports, regenerateReport } from './reports';
import { listOutreach } from './outreach';
import { getFocusConfig, saveFocusConfig } from './focus';
import { setProjectLocked } from './vault';
import { claimIdempotency, completeIdempotency } from '@/lib/mcp/idempotency';
import { hashMcpArguments } from '@/lib/mcp/request-hash';

const integrationEnabled = process.env.INTEGRATION_TESTS === '1';

async function collectIds(
  fetchPage: (cursor?: string) => Promise<{
    items: Array<{ id: string }>;
    nextCursor: string | null;
  }>
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await fetchPage(cursor);
    ids.push(...page.items.map(item => item.id));
    if (!page.nextCursor) return ids;
    cursor = page.nextCursor;
  }

  throw new Error('Pagination did not terminate.');
}

describe.skipIf(!integrationEnabled)('Issue 2 tenant, vault, and pagination invariants', () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const publicProjectId = `${userAId}-public-project`;
  const privateProjectId = `${userAId}-private-project`;
  const foreignProjectId = `${userBId}-foreign-project`;
  const contactAId = `${userAId}-contact`;
  const contactBId = `${userBId}-contact`;
  const activityIds = [1, 2, 3].map(index => `${userAId}-activity-${index}`);
  const goalIds = [1, 2, 3].map(index => `${userAId}-goal-${index}`);
  const outreachIds = [1, 2, 3].map(index => `${userAId}-outreach-${index}`);
  const reportIds = [1, 2, 3, 4].map(index => `${userAId}-report-${index}`);

  const lockedActor: McpActor = {
    userId: userAId,
    source: 'mcp',
    connectionId: 'issue-2-locked',
    clientId: 'issue-2-client',
    scopes: ['jobmark:read', 'jobmark:write'],
    vaultUnlocked: false,
    vaultUnlockedUntil: null,
    requestId: randomUUID(),
  };
  const expiredActor: McpActor = {
    ...lockedActor,
    connectionId: 'issue-2-expired',
    vaultUnlockedUntil: new Date('2026-09-12T11:59:00.000Z'),
    requestId: randomUUID(),
  };
  const unlockedActor: McpActor = {
    ...lockedActor,
    connectionId: 'issue-2-unlocked',
    vaultUnlocked: true,
    vaultUnlockedUntil: new Date('2026-09-12T13:00:00.000Z'),
    requestId: randomUUID(),
  };
  const destructiveActor: McpActor = {
    ...unlockedActor,
    connectionId: 'issue-2-destructive',
    scopes: ['jobmark:read', 'jobmark:write', 'jobmark:destructive'],
    requestId: randomUUID(),
  };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));

    await prisma.user.createMany({
      data: [
        { id: userAId, email: `issue-2-a-${userAId}@example.test` },
        { id: userBId, email: `issue-2-b-${userBId}@example.test` },
      ],
    });
    await prisma.project.createMany({
      data: [
        {
          id: publicProjectId,
          userId: userAId,
          name: 'Issue 2 public project',
          createdAt: new Date('2026-09-12T12:00:00.000Z'),
        },
        {
          id: privateProjectId,
          userId: userAId,
          name: 'Issue 2 private project',
          locked: true,
          createdAt: new Date('2026-09-12T11:00:00.000Z'),
        },
        {
          id: foreignProjectId,
          userId: userBId,
          name: 'Issue 2 foreign project',
          createdAt: new Date('2026-09-12T10:00:00.000Z'),
        },
      ],
    });
    await prisma.contact.createMany({
      data: [
        { id: contactAId, userId: userAId, fullName: 'Issue 2 contact A' },
        { id: contactBId, userId: userBId, fullName: 'Issue 2 contact B' },
      ],
    });
    await prisma.goal.createMany({
      data: goalIds.map((id, index) => ({
        id,
        userId: userAId,
        title: `Issue 2 goal ${index + 1}`,
        createdAt: new Date(Date.UTC(2026, 8, 12, 12 - index)),
      })),
    });
    await prisma.activity.createMany({
      data: [
        ...activityIds.map((id, index) => {
          let projectId: string | null = null;
          if (index === 0) projectId = publicProjectId;
          else if (index === 1) projectId = privateProjectId;
          return {
            id,
            userId: userAId,
            projectId,
            content: `Issue 2 activity ${index + 1}`,
            logDate: new Date('2026-09-12T00:00:00.000Z'),
            createdAt: new Date(Date.UTC(2026, 8, 12, 12 - index)),
          };
        }),
        {
          id: `${userBId}-linked-activity`,
          userId: userBId,
          projectId: publicProjectId,
          content: 'Foreign activity must not affect User A counts',
          logDate: new Date('2026-09-12T00:00:00.000Z'),
        },
      ],
    });
    await prisma.interactionLog.createMany({
      data: [
        {
          id: `${userAId}-interaction`,
          userId: userAId,
          contactId: contactAId,
          summary: 'User A interaction',
        },
        {
          id: `${userBId}-linked-interaction`,
          userId: userBId,
          contactId: contactAId,
          summary: 'Foreign interaction must not affect User A counts',
        },
      ],
    });
    await prisma.outreachDraft.createMany({
      data: [
        ...outreachIds.map((id, index) => ({
          id,
          userId: userAId,
          contactId: contactAId,
          title: `Issue 2 outreach ${index + 1}`,
          content: `Issue 2 outreach content ${index + 1}`,
          createdAt: new Date(Date.UTC(2026, 8, 12, 12 - index)),
        })),
        {
          id: `${userBId}-linked-outreach`,
          userId: userBId,
          contactId: contactAId,
          title: 'Foreign outreach',
          content: 'Foreign outreach must not affect User A counts',
        },
      ],
    });
    await prisma.report.createMany({
      data: [
        {
          id: reportIds[0],
          userId: userAId,
          projectId: publicProjectId,
          title: 'Issue 2 public report',
          content: 'Public report',
          metadata: {
            generated: true,
            deterministic: true,
            scope: 'project',
            projectId: publicProjectId,
            sourceProjectIds: [publicProjectId],
          },
          createdAt: new Date('2026-09-12T12:00:00.000Z'),
        },
        {
          id: reportIds[1],
          userId: userAId,
          projectId: privateProjectId,
          title: 'Issue 2 private report',
          content: 'Private report',
          metadata: {
            generated: true,
            deterministic: true,
            scope: 'project',
            projectId: privateProjectId,
            sourceProjectIds: [privateProjectId],
          },
          createdAt: new Date('2026-09-12T11:00:00.000Z'),
        },
        {
          id: reportIds[2],
          userId: userAId,
          title: 'Issue 2 unassigned report',
          content: 'Unassigned report',
          metadata: {
            generated: true,
            deterministic: true,
            scope: 'all',
            projectId: null,
            sourceProjectIds: [],
          },
          createdAt: new Date('2026-09-12T10:00:00.000Z'),
        },
        {
          id: reportIds[3],
          userId: userAId,
          title: 'Issue 2 legacy aggregate',
          content: 'Legacy aggregate without provenance',
          metadata: { scope: 'all' },
          createdAt: new Date('2026-09-12T09:00:00.000Z'),
        },
        {
          id: `${userBId}-linked-report`,
          userId: userBId,
          projectId: publicProjectId,
          title: 'Foreign report',
          content: 'Foreign report must not affect User A counts',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.$disconnect();
    vi.useRealTimers();
  });

  it('keeps tenant, locked-project, expired-grant, and report provenance boundaries', async () => {
    const lockedProjects = await listProjects(lockedActor, { includeArchived: true, limit: 100 });
    expect(lockedProjects.projects.map(project => project.id)).toEqual([publicProjectId]);

    const expiredProjects = await listProjects(expiredActor, { includeArchived: true, limit: 100 });
    expect(expiredProjects.projects.map(project => project.id)).toEqual([publicProjectId]);

    const unlockedProjects = await listProjects(unlockedActor, {
      includeArchived: true,
      limit: 100,
    });
    expect(unlockedProjects.projects.map(project => project.id)).toEqual([
      publicProjectId,
      privateProjectId,
    ]);

    const lockedActivities = await listActivities(lockedActor, { limit: 100 });
    expect(lockedActivities.activities.map(activity => activity.id)).toEqual([
      activityIds[0],
      activityIds[2],
    ]);
    const unlockedActivities = await listActivities(unlockedActor, { limit: 100 });
    expect(unlockedActivities.activities.map(activity => activity.id)).toEqual(activityIds);

    const lockedReports = await listReports(lockedActor, { limit: 100 });
    expect(lockedReports.reports.map(report => report.id)).toEqual([reportIds[0], reportIds[2]]);
    expect(lockedReports.totalCount).toBe(2);
    await expect(getReport(lockedActor, reportIds[1])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(getProject(lockedActor, privateProjectId)).rejects.toMatchObject({
      code: 'VAULT_LOCKED',
    });
    await expect(getProjectWithActivities(lockedActor, foreignProjectId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const contact = (await listContacts(unlockedActor, { limit: 100 })).contacts.find(
      candidate => candidate.id === contactAId
    );
    expect(contact?._count).toEqual({ interactions: 1, outreachDrafts: 3 });

    const dashboard = await getDashboardStats(lockedActor);
    expect(dashboard.activities.total).toBe(2);
    expect(dashboard.reports.total).toBe(2);

    const insights = await getInsights(lockedActor);
    expect(insights.weeklyTrend).toHaveLength(12);
    expect(insights.weeklyTrend.at(-1)?.count).toBe(2);
  });

  it('rejects cross-tenant project reassignment', async () => {
    await expect(
      updateActivity(unlockedActor, activityIds[0], { projectId: foreignProjectId })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await expect(
      prisma.activity.findUniqueOrThrow({ where: { id: activityIds[0] } })
    ).resolves.toMatchObject({ projectId: publicProjectId });

    await expect(
      updateActivity(lockedActor, activityIds[0], { projectId: privateProjectId })
    ).rejects.toMatchObject({ code: 'VAULT_LOCKED' });

    await expect(
      updateActivity(unlockedActor, activityIds[0], { projectId: privateProjectId })
    ).resolves.toMatchObject({ projectId: privateProjectId });
    await expect(
      updateActivity(unlockedActor, activityIds[0], { projectId: null })
    ).resolves.toMatchObject({ projectId: null });
    await expect(
      updateActivity(unlockedActor, activityIds[0], { projectId: publicProjectId })
    ).resolves.toMatchObject({ projectId: publicProjectId });
  });

  it('allows a locked actor to hide an owned public project but not reopen a private one', async () => {
    await expect(setProjectLocked(lockedActor, publicProjectId, true)).resolves.toEqual({
      success: true,
    });
    await expect(setProjectLocked(lockedActor, publicProjectId, false)).rejects.toMatchObject({
      code: 'VAULT_LOCKED',
    });
    await expect(setProjectLocked(unlockedActor, publicProjectId, false)).resolves.toEqual({
      success: true,
    });
  });

  it('keeps destructive operations behind an explicit disposable actor', async () => {
    const disposableGoalId = `${userAId}-destructive-goal`;
    await prisma.goal.create({
      data: { id: disposableGoalId, userId: userAId, title: 'Delete this disposable goal' },
    });

    await expect(deleteGoal(destructiveActor, disposableGoalId)).resolves.toBeUndefined();
    await expect(prisma.goal.findUnique({ where: { id: disposableGoalId } })).resolves.toBeNull();
  });

  it('walks every cursor list without skipping or duplicating rows', async () => {
    await expect(
      collectIds(async cursor => {
        const page = await listActivities(unlockedActor, { limit: 1, cursor });
        return { items: page.activities, nextCursor: page.nextCursor };
      })
    ).resolves.toEqual(activityIds);

    await expect(
      collectIds(async cursor => {
        const page = await listProjects(unlockedActor, {
          includeArchived: true,
          limit: 1,
          cursor,
        });
        return { items: page.projects, nextCursor: page.nextCursor };
      })
    ).resolves.toEqual([publicProjectId, privateProjectId]);

    await expect(
      collectIds(async cursor => {
        const page = await listGoals(unlockedActor, { limit: 1, cursor });
        return { items: page.goals, nextCursor: page.nextCursor };
      })
    ).resolves.toEqual(goalIds);

    await expect(
      collectIds(async cursor => {
        const page = await listOutreach(unlockedActor, { limit: 1, cursor });
        return { items: page.outreach, nextCursor: page.nextCursor };
      })
    ).resolves.toEqual(outreachIds);

    await expect(
      collectIds(async cursor => {
        const page = await listReports(unlockedActor, { limit: 1, cursor });
        return { items: page.reports, nextCursor: page.nextCursor };
      })
    ).resolves.toEqual(reportIds);
  });

  it('round-trips the canonical Focus blocks and preserves saved report scope', async () => {
    const focusConfig = [
      {
        id: 'issue-2-breathing',
        type: 'breathing' as const,
        config: { pattern: 'box' as const, cycles: 4 },
      },
      {
        id: 'issue-2-affirmation',
        type: 'affirmation' as const,
        config: { texts: ['Ship the smallest safe change.'], totalDuration: 30 },
      },
    ];

    await saveFocusConfig(unlockedActor, focusConfig);
    await expect(getFocusConfig(lockedActor)).resolves.toMatchObject({ blocks: focusConfig });

    const generated = await generateReport(unlockedActor, null, undefined, {
      scope: 'all',
      dateRange: 'custom',
      customStartDate: '2026-09-12',
      customEndDate: '2026-09-12',
      tone: 'bullet-points',
      notes: 'Highlight the concrete result.',
    });
    expect(generated.metadata).toMatchObject({
      generated: true,
      deterministic: true,
      scope: 'all',
      dateRange: 'custom',
      rangeStartDate: '2026-09-12',
      rangeEndDate: '2026-09-12',
      tone: 'bullet-points',
      notes: 'Highlight the concrete result.',
      sourceProjectIds: [publicProjectId, privateProjectId],
    });

    await prisma.activity.create({
      data: {
        id: `${userAId}-activity-after-report`,
        userId: userAId,
        projectId: publicProjectId,
        content: 'Issue 2 activity added after the first report.',
        logDate: new Date('2026-09-12T00:00:00.000Z'),
      },
    });

    const regenerated = await regenerateReport(unlockedActor, generated.id);
    expect(regenerated.content).toContain('Issue 2 activity added after the first report.');
    expect(regenerated.metadata).toMatchObject({
      dateRange: 'custom',
      rangeStartDate: '2026-09-12',
      rangeEndDate: '2026-09-12',
      tone: 'bullet-points',
      notes: 'Highlight the concrete result.',
    });

    await expect(regenerateReport(unlockedActor, reportIds[3])).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    await expect(listReports(lockedActor, { limit: 100 })).resolves.not.toMatchObject({
      reports: expect.arrayContaining([expect.objectContaining({ id: generated.id })]),
    });
  });

  it('does not duplicate a keyed report mutation on a same-argument retry', async () => {
    const requestKey = `issue-2-report-${userAId}`;
    const requestArgs = {
      scope: 'all',
      dateRange: 'custom',
      customStartDate: '2026-09-12',
      customEndDate: '2026-09-12',
    } as const;
    const idempotencyKey = {
      connectionId: 'issue-2-retry',
      toolName: 'reports_generate',
      requestKey,
      requestHash: hashMcpArguments(requestArgs),
    };

    await prisma.mcpIdempotency.deleteMany({
      where: {
        connectionId: idempotencyKey.connectionId,
        toolName: idempotencyKey.toolName,
        requestKey,
      },
    });

    const before = await prisma.report.count({ where: { userId: userAId } });
    const claim = await claimIdempotency(idempotencyKey);
    expect(claim).toEqual({ kind: 'owner' });

    const created = await generateReport(unlockedActor, null, undefined, requestArgs);
    await completeIdempotency(idempotencyKey, {
      content: [{ type: 'text', text: 'report created' }],
    });

    await expect(claimIdempotency(idempotencyKey)).resolves.toMatchObject({ kind: 'cached' });
    await expect(prisma.report.count({ where: { userId: userAId } })).resolves.toBe(before + 1);

    await prisma.report.delete({ where: { id: created.id } });
    await prisma.mcpIdempotency.deleteMany({
      where: {
        connectionId: idempotencyKey.connectionId,
        toolName: idempotencyKey.toolName,
        requestKey,
      },
    });
  });
});
