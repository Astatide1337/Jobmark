/**
 * Insights domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import {
  filterLockedReports,
  getLockedProjectIdsForActor,
  buildLockedActivityFilter,
} from '@/lib/project-lock';
import { JobmarkActor, assertActor } from './index';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
  calculateStreaks,
  shiftCalendarDate,
} from '@/lib/date-semantics';

export type DashboardStats = {
  activities: {
    total: number;
    thisWeek: number;
    thisMonth: number;
  };
  projects: { active: number; archived: number };
  reports: { total: number };
  goals: { total: number };
  contacts: { total: number };
  streak: { current: number; longest: number };
};

export type InsightsData = {
  activityHeatmap: { date: string; count: number }[];
  weeklyTrend: { week: string; count: number }[];
  projectDistribution: { projectId: string; projectName: string; color: string; count: number }[];
  reportStats: { total: number; byProject: { projectId: string; name: string; count: number }[] };
};

export async function getDashboardStats(actor: JobmarkActor): Promise<DashboardStats> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIdsForActor(actor);
  const lockedFilter = buildLockedActivityFilter(lockedIds);

  const now = new Date();
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { timeZone: true },
  });
  const timeZone =
    userSettings?.timeZone && isValidTimeZone(userSettings.timeZone)
      ? userSettings.timeZone
      : DEFAULT_TIME_ZONE;
  const todayDate = getCalendarDate(now, timeZone);
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });
  const dayOfWeek = new Date(`${todayDate}T00:00:00.000Z`).getUTCDay();
  const weekStart = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, -dayOfWeek));
  const weekEnd = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 7 - dayOfWeek));

  const [
    totalActivities,
    thisWeek,
    thisMonth,
    activeProjects,
    archivedProjects,
    totalGoals,
    totalContacts,
    totalReports,
  ] = await Promise.all([
    prisma.activity.count({ where: { userId: actor.userId, ...lockedFilter } }),
    prisma.activity.count({
      where: { userId: actor.userId, logDate: { gte: weekStart, lt: weekEnd }, ...lockedFilter },
    }),
    prisma.activity.count({
      where: {
        userId: actor.userId,
        logDate: { gte: monthRange.start, lt: monthRange.endExclusive },
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
    prisma.project.count({
      where: {
        userId: actor.userId,
        archived: true,
        ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
      },
    }),
    prisma.goal.count({ where: { userId: actor.userId } }),
    prisma.contact.count({ where: { userId: actor.userId } }),
    prisma.report.findMany({
      where: { userId: actor.userId },
      select: { projectId: true, metadata: true },
    }),
  ]);

  const visibleReports = filterLockedReports(totalReports, lockedIds);

  // Calculate streak from unique calendar dates, anchored to today or the
  // immediately preceding day. Future-dated rows never create a streak.
  const recentActivities = await prisma.activity.findMany({
    where: { userId: actor.userId, ...lockedFilter },
    orderBy: { logDate: 'desc' },
    select: { logDate: true },
  });
  const streaks = calculateStreaks(
    recentActivities.map(activity => activity.logDate.toISOString().slice(0, 10)),
    todayDate
  );

  return {
    activities: { total: totalActivities, thisWeek, thisMonth },
    projects: { active: activeProjects, archived: archivedProjects },
    reports: { total: visibleReports.length },
    goals: { total: totalGoals },
    contacts: { total: totalContacts },
    streak: { current: streaks.current, longest: streaks.longest },
  };
}

export async function getInsights(
  actor: JobmarkActor,
  options: {
    includeHeatmap?: boolean;
    includeWeeklyTrend?: boolean;
    includeProjectDistribution?: boolean;
  } = {}
): Promise<InsightsData> {
  assertActor(actor);

  const {
    includeHeatmap = true,
    includeWeeklyTrend = true,
    includeProjectDistribution = true,
  } = options;

  const lockedIds = await getLockedProjectIdsForActor(actor);
  const lockedFilter = buildLockedActivityFilter(lockedIds);

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { timeZone: true },
  });
  const timeZone =
    userSettings?.timeZone && isValidTimeZone(userSettings.timeZone)
      ? userSettings.timeZone
      : DEFAULT_TIME_ZONE;

  const [heatmap, weeklyTrend, projectDistribution, reportStats] = await Promise.all([
    includeHeatmap
      ? (async () => {
          const yearAgoDate = shiftCalendarDate(getCalendarDate(new Date(), timeZone), -365);
          const todayDate = getCalendarDate(new Date(), timeZone);
          const activities = await prisma.activity.findMany({
            where: {
              userId: actor.userId,
              logDate: {
                gte: calendarDateToUtcMidnight(yearAgoDate),
                lt: calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 1)),
              },
              ...lockedFilter,
            },
            select: { logDate: true },
            orderBy: { logDate: 'asc' },
          });

          const dateMap = new Map<string, number>();
          for (const a of activities) {
            const date = a.logDate.toISOString().split('T')[0];
            dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
          }

          return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
        })()
      : Promise.resolve([]),
    includeWeeklyTrend
      ? (async () => {
          const weeks = 12;
          const todayDate = getCalendarDate(new Date(), timeZone);
          const currentWeekStart = shiftCalendarDate(
            todayDate,
            -new Date(`${todayDate}T00:00:00Z`).getUTCDay()
          );
          const startDate = shiftCalendarDate(currentWeekStart, -(weeks - 1) * 7);
          const activities = await prisma.activity.findMany({
            where: {
              userId: actor.userId,
              logDate: {
                gte: calendarDateToUtcMidnight(startDate),
                lt: calendarDateToUtcMidnight(shiftCalendarDate(todayDate, 1)),
              },
              ...lockedFilter,
            },
            select: { logDate: true },
          });

          const weekMap = new Map<string, number>();
          for (let index = 0; index < weeks; index += 1) {
            weekMap.set(shiftCalendarDate(startDate, index * 7), 0);
          }
          for (const a of activities) {
            const date = a.logDate.toISOString().split('T')[0];
            const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
            const weekKey = shiftCalendarDate(date, -dayOfWeek);
            weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
          }

          return Array.from(weekMap, ([week, count]) => ({ week, count }));
        })()
      : Promise.resolve([]),
    includeProjectDistribution
      ? (async () => {
          const projects = await prisma.project.findMany({
            where: {
              userId: actor.userId,
              archived: false,
              ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
            },
            select: {
              id: true,
              name: true,
              color: true,
              _count: { select: { activities: { where: { userId: actor.userId } } } },
            },
          });
          return projects.map(p => ({
            projectId: p.id,
            projectName: p.name,
            color: p.color,
            count: p._count.activities,
          }));
        })()
      : Promise.resolve([]),
    (async () => {
      const reports = await prisma.report.findMany({
        where: { userId: actor.userId },
        select: { projectId: true, metadata: true, project: { select: { id: true, name: true } } },
      });

      const visibleReports = filterLockedReports(reports, lockedIds);

      const byProject = new Map<string, { projectId: string; name: string; count: number }>();
      for (const r of visibleReports) {
        if (r.projectId && r.project) {
          const key = r.projectId;
          if (!byProject.has(key)) {
            byProject.set(key, { projectId: key, name: r.project.name, count: 0 });
          }
          byProject.get(key)!.count++;
        }
      }
      return { total: visibleReports.length, byProject: Array.from(byProject.values()) };
    })(),
  ]);

  return {
    activityHeatmap: heatmap,
    weeklyTrend: weeklyTrend,
    projectDistribution: projectDistribution,
    reportStats: reportStats,
  };
}
