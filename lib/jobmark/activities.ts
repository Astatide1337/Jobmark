/**
 * Activities domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getLockedProjectIds } from '@/lib/project-lock';
import {
  JobmarkActor,
  assertActor,
  ValidationError,
  NotFoundError,
  VaultLockedError,
} from './index';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';
import { z } from 'zod';

const activityCreateSchema = z.object({
  content: z.string().min(10, 'Activity must be at least 10 characters').max(1000),
  projectId: z.string().optional().nullable(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const activityUpdateSchema = z.object({
  content: z.string().min(10).max(1000).optional(),
  projectId: z.string().optional().nullable(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ActivityInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export type ActivityDTO = {
  id: string;
  content: string;
  logDate: string;
  projectId: string | null;
  project: { id: string; name: string; color: string; archived: boolean } | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivitiesListResult = {
  activities: ActivityDTO[];
  nextCursor: string | null;
  totalCount: number;
};

export async function listActivities(
  actor: JobmarkActor,
  options: { limit?: number; cursor?: string; hideArchived?: boolean } = {}
): Promise<ActivitiesListResult> {
  assertActor(actor);

  const { limit = 50, cursor, hideArchived = false } = options;
  const lockedIds = await getLockedProjectIds(actor.userId);

  const where: Prisma.ActivityWhereInput = { userId: actor.userId };
  const filters: Prisma.ActivityWhereInput[] = [];
  if (lockedIds.length > 0) {
    filters.push({ OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] });
  }
  if (hideArchived) {
    filters.push({ OR: [{ projectId: null }, { project: { archived: false } }] });
  }
  if (filters.length > 0) where.AND = filters;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      project: { select: { id: true, name: true, color: true, archived: true } },
    },
  });

  let nextCursor: string | null = null;
  if (activities.length > limit) {
    const next = activities.pop();
    nextCursor = next!.id;
  }

  const totalCount = await prisma.activity.count({ where });

  return {
    activities: activities.map(toActivityDTO),
    nextCursor,
    totalCount,
  };
}

export async function getActivityStats(actor: JobmarkActor): Promise<{
  thisMonth: number;
  today: number;
  thisWeek: number;
  totalCount: number;
  projectCount: number;
  recentDates: string[];
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
}> {
  assertActor(actor);

  const now = new Date();
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { timeZone: true, dailyTarget: true, weeklyTarget: true, monthlyTarget: true },
  });

  const timeZone = userSettings?.timeZone && isValidTimeZone(userSettings.timeZone)
    ? userSettings.timeZone
    : DEFAULT_TIME_ZONE;

  const todayDate = getCalendarDate(now, timeZone);
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });
  const startOfDay = calendarDateToUtcMidnight(todayDate);
  const endOfDay = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 1));
  const dayOfWeek = new Date(`${todayDate}T00:00:00Z`).getUTCDay();
  const startOfWeek = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, -dayOfWeek));
  const endOfWeek = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 7 - dayOfWeek));

  const lockedIds = await getLockedProjectIds(actor.userId);
  const lockedFilter = lockedIds.length > 0
    ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
    : {};

  const [settings, thisMonthCount, todayCount, thisWeekCount, projectCount, totalCount] =
    await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: actor.userId },
        select: { dailyTarget: true, weeklyTarget: true, monthlyTarget: true },
      }),
      prisma.activity.count({
        where: {
          userId: actor.userId,
          logDate: { gte: monthRange.start, lt: monthRange.endExclusive },
          ...lockedFilter,
        },
      }),
      prisma.activity.count({
        where: {
          userId: actor.userId,
          logDate: { gte: startOfDay, lt: endOfDay },
          ...lockedFilter,
        },
      }),
      prisma.activity.count({
        where: {
          userId: actor.userId,
          logDate: { gte: startOfWeek, lt: endOfWeek },
          ...lockedFilter,
        },
      }),
      prisma.project.count({
        where: {
          userId: actor.userId,
          archived: false,
          ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
        },
      }),
      prisma.activity.count({
        where: { userId: actor.userId, ...lockedFilter },
      }),
    ]);

  const recentActivities = await prisma.activity.findMany({
    where: { userId: actor.userId, ...lockedFilter },
    orderBy: { logDate: 'desc' },
    select: { logDate: true },
    take: 365,
  });

  const recentDates = recentActivities.map(
    (a) => `${a.logDate.toISOString().slice(0, 10)}T12:00:00.000Z`
  );

  return {
    thisMonth: thisMonthCount,
    today: todayCount,
    thisWeek: thisWeekCount,
    totalCount,
    projectCount,
    recentDates,
    dailyGoal: settings?.dailyTarget ?? 3,
    weeklyGoal: settings?.weeklyTarget ?? 15,
    monthlyGoal: settings?.monthlyTarget ?? 40,
  };
}

export async function getActivity(actor: JobmarkActor, activityId: string): Promise<ActivityDTO> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIds(actor.userId);
  const lockedFilter = lockedIds.length > 0
    ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
    : {};

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: actor.userId, ...lockedFilter },
    include: { project: { select: { id: true, name: true, color: true, archived: true } } },
  });

  if (!activity) throw new NotFoundError('Activity');

  return toActivityDTO(activity);
}

export async function createActivity(actor: JobmarkActor, input: ActivityInput): Promise<ActivityDTO> {
  assertActor(actor);

  const result = activityCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const settings = result.data.logDate
    ? null
    : await prisma.userSettings.findUnique({
        where: { userId: actor.userId },
        select: { timeZone: true },
      });

  const timeZone = settings?.timeZone && isValidTimeZone(settings.timeZone)
    ? settings.timeZone
    : DEFAULT_TIME_ZONE;
  const defaultLogDate = calendarDateToUtcMidnight(getCalendarDate(new Date(), timeZone));
  const logDate = result.data.logDate
    ? calendarDateToUtcMidnight(result.data.logDate)
    : defaultLogDate;

  if (result.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: result.data.projectId, userId: actor.userId },
      select: { locked: true },
    });
    if (!project) throw new NotFoundError('Project');
    if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();
  }

  const activity = await prisma.activity.create({
    data: {
      userId: actor.userId,
      content: result.data.content,
      projectId: result.data.projectId || null,
      logDate,
    },
    include: { project: { select: { id: true, name: true, color: true, archived: true } } },
  });

  return toActivityDTO(activity);
}

export async function updateActivity(
  actor: JobmarkActor,
  activityId: string,
  input: ActivityUpdateInput
): Promise<ActivityDTO> {
  assertActor(actor);

  const result = activityUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  if (!activity) throw new NotFoundError('Activity');
  if (activity.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const data: Prisma.ActivityUncheckedUpdateInput = {
    content: result.data.content,
    projectId: result.data.projectId,
    logDate: result.data.logDate
      ? calendarDateToUtcMidnight(result.data.logDate)
      : undefined,
  };

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data,
    include: { project: { select: { id: true, name: true, color: true, archived: true } } },
  });

  return toActivityDTO(updated);
}

export async function deleteActivity(actor: JobmarkActor, activityId: string): Promise<void> {
  assertActor(actor);

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  if (!activity) throw new NotFoundError('Activity');
  if (activity.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  await prisma.activity.delete({ where: { id: activityId } });
}

type ActivityWithProject = Prisma.ActivityGetPayload<{
  include: { project: { select: { id: true; name: true; color: true; archived: true } } };
}>;

function toActivityDTO(activity: ActivityWithProject): ActivityDTO {
  return {
    id: activity.id,
    content: activity.content,
    logDate: activity.logDate.toISOString().split('T')[0],
    projectId: activity.projectId,
    project: activity.project,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
