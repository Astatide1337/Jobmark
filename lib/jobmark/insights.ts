/**
 * Insights domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { getLockedProjectIds, buildLockedActivityFilter } from '@/lib/project-lock';
import { JobmarkActor, assertActor } from './index';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
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

  const lockedIds = await getLockedProjectIds(actor.userId);
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
  const weekRange = getCalendarRange({ kind: '7d', now, timeZone });
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });

  const [
    totalActivities,
    thisWeek,
    thisMonth,
    activeProjects,
    archivedProjects,
    totalReports,
    totalGoals,
    totalContacts,
  ] = await Promise.all([
    prisma.activity.count({ where: { userId: actor.userId, ...lockedFilter } }),
    prisma.activity.count({
      where: {
        userId: actor.userId,
        logDate: { gte: weekRange.start, lt: weekRange.endExclusive },
        ...lockedFilter,
      },
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
    prisma.report.count({ where: { userId: actor.userId, ...lockedFilter } }),
    prisma.goal.count({ where: { userId: actor.userId } }),
    prisma.contact.count({ where: { userId: actor.userId } }),
  ]);

  // Calculate streak
  const recentActivities = await prisma.activity.findMany({
    where: { userId: actor.userId, ...lockedFilter },
    orderBy: { logDate: 'desc' },
    select: { logDate: true },
    take: 365,
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let current = 0;
  let prevDate: Date | null = null;

  for (const a of recentActivities) {
    const d = new Date(`${a.logDate.toISOString().split('T')[0]}T12:00:00Z`);
    if (!prevDate) {
      current = 1;
    } else {
      const diff = Math.floor((prevDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        current++;
      } else if (diff > 1) {
        if (current > longestStreak) longestStreak = current;
        current = 1;
      }
    }
    prevDate = d;
  }
  if (current > longestStreak) longestStreak = current;
  currentStreak = current;

  return {
    activities: { total: totalActivities, thisWeek, thisMonth },
    projects: { active: activeProjects, archived: archivedProjects },
    reports: { total: totalReports },
    goals: { total: totalGoals },
    contacts: { total: totalContacts },
    streak: { current: currentStreak, longest: longestStreak },
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

  const lockedIds = await getLockedProjectIds(actor.userId);
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
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          const activities = await prisma.activity.findMany({
            where: {
              userId: actor.userId,
              logDate: { gte: calendarDateToUtcMidnight(getCalendarDate(yearAgo, timeZone)) },
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
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - weeks * 7);
          const activities = await prisma.activity.findMany({
            where: {
              userId: actor.userId,
              logDate: { gte: calendarDateToUtcMidnight(getCalendarDate(startDate, timeZone)) },
              ...lockedFilter,
            },
            select: { logDate: true },
          });

          const weekMap = new Map<string, number>();
          for (const a of activities) {
            const date = new Date(`${a.logDate.toISOString().split('T')[0]}T00:00:00Z`);
            const weekStart = new Date(date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
          }

          return Array.from(weekMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, count]) => ({ week, count }));
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
            select: { id: true, name: true, color: true, _count: { select: { activities: true } } },
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
        where: { userId: actor.userId, ...lockedFilter },
        select: { projectId: true, project: { select: { id: true, name: true } } },
      });

      const byProject = new Map<string, { projectId: string; name: string; count: number }>();
      for (const r of reports) {
        if (r.projectId && r.project) {
          const key = r.projectId;
          if (!byProject.has(key)) {
            byProject.set(key, { projectId: key, name: r.project.name, count: 0 });
          }
          byProject.get(key)!.count++;
        }
      }
      return { total: reports.length, byProject: Array.from(byProject.values()) };
    })(),
  ]);

  return {
    activityHeatmap: heatmap,
    weeklyTrend: weeklyTrend,
    projectDistribution: projectDistribution,
    reportStats: reportStats,
  };
}
