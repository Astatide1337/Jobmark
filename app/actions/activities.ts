/**
 * Activity Server Actions
 *
 * Why: Activities are the "heartbeat" of the application. These actions handle
 * creating, retrieving, and calculating statistics for everything a user logs.
 *
 * Optimization:
 * - Read actions derive identity from the authenticated server session so
 *   callers cannot select another tenant.
 * - `getActivityStats` uses `Promise.all` to execute independent Prisma
 *   queries in parallel, drastically reducing page load latency.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, buildLockedActivityFilter } from '@/lib/project-lock';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getActivityDisplayContent } from '@/lib/jobmark/activity-copy';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';

const activitySchema = z.object({
  content: z.string().min(10, 'Write at least 10 characters.').max(1000),
  projectId: z.string().optional().nullable(),
  logDate: z.date().optional(),
});

export type ActivityFormState = {
  success: boolean;
  message: string;
  errors?: {
    content?: string[];
    projectId?: string[];
  };
};

export async function createActivity(
  prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to save a note.' };
  }

  const logDateStr = formData.get('logDate') as string | null;
  const settings = logDateStr
    ? null
    : await prisma.userSettings.findUnique({
        where: { userId: session.user.id },
        select: { timeZone: true },
      });
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  const defaultLogDate = calendarDateToUtcMidnight(getCalendarDate(new Date(), timeZone));

  const rawData = {
    content: formData.get('content') as string,
    projectId: formData.get('projectId') as string | null,
    logDate: logDateStr ? new Date(logDateStr) : defaultLogDate,
  };

  const result = activitySchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: 'Check the note and try again.',
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.$transaction(async tx => {
      if (result.data.projectId) {
        const project = await tx.project.findFirst({
          where: { id: result.data.projectId, userId: session.user.id },
          select: { locked: true },
        });
        if (!project) throw new Error('Invalid project');
        if (project.locked) throw new Error('Locked project');
      }

      await tx.activity.create({
        data: {
          userId: session.user.id,
          content: result.data.content,
          projectId: result.data.projectId || null,
          logDate: result.data.logDate || defaultLogDate,
        },
      });
    });

    revalidatePath('/dashboard');

    return { success: true, message: 'Note saved.' };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Invalid project' || error.message === 'Locked project')
    ) {
      return { success: false, message: 'That project is not available.' };
    }
    console.error('Failed to create activity:', error);
    return { success: false, message: 'The note was not saved. Try again.' };
  }
}

export async function getActivities(limit = 20, offset = 0, hideArchived = false) {
  const targetUserId = await requireUserId();

  const lockedIds = await getLockedProjectIds(targetUserId);

  const activities = await prisma.activity.findMany({
    where: {
      userId: targetUserId,
      AND: [
        // Filter archived projects if requested
        ...(hideArchived
          ? [
              {
                OR: [{ projectId: null }, { project: { archived: false } }],
              },
            ]
          : []),
        // Filter locked projects when vault is closed
        ...(lockedIds.length > 0
          ? [
              {
                OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
              },
            ]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      project: {
        select: { id: true, name: true, color: true, archived: true },
      },
    },
  });

  // Convert logDate to ISO date string (YYYY-MM-DD) to prevent timezone issues
  // when serializing from Server Component to Client Component
  return activities.map(activity => ({
    ...activity,
    content: getActivityDisplayContent(activity.content),
    logDate: activity.logDate.toISOString().split('T')[0],
  }));
}

export async function deleteActivity(activityId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to delete this note.' };
  }

  try {
    await prisma.activity.delete({
      where: {
        id: activityId,
        userId: session.user.id, // Ensure user owns this activity
      },
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Note deleted.' };
  } catch (error) {
    console.error('Failed to delete activity:', error);
    return { success: false, message: 'The note was not deleted. Try again.' };
  }
}

export async function getActivityStats() {
  const targetUserId = await requireUserId();

  const now = new Date();
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
    select: { timeZone: true },
  });
  const timeZone =
    userSettings?.timeZone && isValidTimeZone(userSettings.timeZone)
      ? userSettings.timeZone
      : DEFAULT_TIME_ZONE;
  const todayDate = getCalendarDate(now, timeZone);
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });
  const startOfDay = calendarDateToUtcMidnight(todayDate);
  const endOfDay = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 1));
  const dayOfWeek = new Date(`${todayDate}T00:00:00Z`).getUTCDay();
  const startOfWeek = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, -dayOfWeek));
  const endOfWeek = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 7 - dayOfWeek));

  const lockedIds = await getLockedProjectIds(targetUserId);
  const lockedFilter = buildLockedActivityFilter(lockedIds);

  const [settings, thisMonthCount, todayCount, thisWeekCount, projectCount, totalCount] =
    await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: targetUserId },
        select: { dailyTarget: true, weeklyTarget: true, monthlyTarget: true },
      }),
      prisma.activity.count({
        where: {
          userId: targetUserId,
          logDate: { gte: monthRange.start, lt: monthRange.endExclusive },
          ...lockedFilter,
        },
      }),
      prisma.activity.count({
        where: {
          userId: targetUserId,
          logDate: { gte: startOfDay, lt: endOfDay },
          ...lockedFilter,
        },
      }),
      prisma.activity.count({
        where: {
          userId: targetUserId,
          logDate: { gte: startOfWeek, lt: endOfWeek },
          ...lockedFilter,
        },
      }),
      prisma.project.count({
        where: {
          userId: targetUserId,
          archived: false,
          ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
        },
      }),
      prisma.activity.count({
        where: {
          userId: targetUserId,
          ...lockedFilter,
        },
      }),
    ]);

  // Return calendar dates, not timestamps. The dashboard uses the same
  // persisted timezone as the server query, so the client never has to
  // reinterpret a date-only value in its own timezone.
  const recentActivities = await prisma.activity.findMany({
    where: {
      userId: targetUserId,
      ...lockedFilter,
    },
    orderBy: { logDate: 'desc' },
    select: { logDate: true },
    take: 365,
  });

  const recentDates = recentActivities.map(a => a.logDate.toISOString().slice(0, 10));

  return {
    thisMonth: thisMonthCount,
    todayCount,
    thisWeek: thisWeekCount,
    recentDates,
    projects: projectCount,
    monthlyGoal: settings?.monthlyTarget ?? 40,
    dailyGoal: settings?.dailyTarget ?? 3,
    weeklyGoal: settings?.weeklyTarget ?? 15,
    totalCount,
    today: todayDate,
    timeZone,
  };
}
