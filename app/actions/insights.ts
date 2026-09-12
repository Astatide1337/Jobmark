/**
 * Insights & Analytics Actions
 *
 * Why: To stay motivated, users need to see their progress visualized.
 * This action performs heavy data aggregation to build the "Yearly Heatmap"
 * and "Project Distribution" charts.
 *
 * Performance Strategy (Server-Side Crunching):
 * We perform the complex grid calculations (mapping calendar dates to
 * week-based arrays) on the server. This ensures the client receives
 * a lightweight "ready-to-render" object, preventing lag on low-power devices.
 */
'use server';

import { requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getLockedProjectIds,
  buildLockedActivityFilter,
  filterLockedReports,
} from '@/lib/project-lock';
import {
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
  calculateStreaks,
  shiftCalendarDate,
} from '@/lib/date-semantics';
import {
  buildHeatmapGrid,
  getHeatmapStartDate,
  type HeatmapDataPoint,
  type HeatmapDay,
  type MonthLabel,
} from '@/lib/insights-grid';

export type { HeatmapDataPoint, HeatmapDay, MonthLabel } from '@/lib/insights-grid';

export interface ProjectDistribution {
  name: string;
  count: number;
  color: string;
}

export interface InsightsData {
  timeZone: string;
  today: string;
  totalActivities: number;
  currentStreak: number;
  longestStreak: number;
  bestDay: { date: string; count: number } | null;
  activeDaysThisMonth: number;
  heatmapData: HeatmapDataPoint[]; // Raw data for client-side filtering
  heatmapGrid: HeatmapDay[][]; // Pre-calculated grid for the UI component
  monthLabels: MonthLabel[];
  weeklyTrend: number[];
  projectDistribution: ProjectDistribution[];
  totalReports: number;
}

export async function getInsightsData(): Promise<InsightsData> {
  const targetUserId = await requireUserId();

  const now = new Date();
  const settings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
    select: { timeZone: true },
  });
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  const todayDate = getCalendarDate(now, timeZone);
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });
  const lockedIds = await getLockedProjectIds(targetUserId);
  const lockedFilter = buildLockedActivityFilter(lockedIds);

  // Parallel queries for performance
  const [totalActivities, totalReports, thisMonthActivities, allActivities, projectsWithCounts] =
    await Promise.all([
      // Total activities count
      prisma.activity.count({
        where: { userId: targetUserId, ...lockedFilter },
      }),
      // Count only reports visible under the same vault policy as activities.
      prisma.report
        .findMany({ where: { userId: targetUserId }, select: { projectId: true, metadata: true } })
        .then(reports => filterLockedReports(reports, lockedIds).length),
      // This month's activities (for active days)
      prisma.activity.findMany({
        where: {
          userId: targetUserId,
          logDate: { gte: monthRange.start, lt: monthRange.endExclusive },
          ...lockedFilter,
        },
        select: { logDate: true },
      }),
      // All activities are needed for the All time view and for honest streaks.
      // Activity.logDate is date-only, so this remains a small date/count query
      // even when the user has many notes.
      prisma.activity.findMany({
        where: {
          userId: targetUserId,
          ...lockedFilter,
        },
        select: { logDate: true },
        orderBy: { logDate: 'desc' },
      }),
      // Project distribution
      prisma.activity.groupBy({
        by: ['projectId'],
        where: {
          userId: targetUserId,
          AND: [{ OR: [{ projectId: null }, { project: { userId: targetUserId } }] }, lockedFilter],
        },
        _count: true,
      }),
    ]);

  // Get project details for distribution
  const projectIds = projectsWithCounts
    .map(p => p.projectId)
    .filter((id): id is string => id !== null);

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds }, userId: targetUserId },
    select: { id: true, name: true, color: true },
  });

  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Calculate project distribution
  const projectDistribution: ProjectDistribution[] = projectsWithCounts.map(item => {
    const project = item.projectId ? projectMap.get(item.projectId) : null;
    return {
      name: project?.name || 'Unassigned',
      count: item._count,
      color: project?.color || 'var(--chart-5)',
    };
  });

  const visibleDatedActivities = allActivities.filter(
    activity => activity.logDate.toISOString().slice(0, 10) <= todayDate
  );

  // Calculate heatmap data
  const heatmapMap = new Map<string, number>();
  visibleDatedActivities.forEach(activity => {
    const dateStr = activity.logDate.toISOString().slice(0, 10);
    heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1);
  });

  const heatmapData: HeatmapDataPoint[] = Array.from(heatmapMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const heatmapStart = getHeatmapStartDate(heatmapData[0]?.date, todayDate);
  const { heatmapGrid, monthLabels } = buildHeatmapGrid(heatmapData, heatmapStart, todayDate);

  // Find best day
  let bestDay: { date: string; count: number } | null = null;
  heatmapMap.forEach((count, date) => {
    if (!bestDay || count > bestDay.count) {
      bestDay = { date, count };
    }
  });

  // Calculate active days this month
  const thisMonthDates = new Set(
    thisMonthActivities.map(a => a.logDate.toISOString().slice(0, 10))
  );
  const activeDaysThisMonth = thisMonthDates.size;

  // Calculate weekly trend (last 12 weeks)
  const weeklyTrend: number[] = [];
  const currentWeekStart = shiftCalendarDate(
    todayDate,
    -new Date(`${todayDate}T00:00:00Z`).getUTCDay()
  );
  for (let i = 11; i >= 0; i--) {
    const weekStart = shiftCalendarDate(currentWeekStart, -i * 7);
    const weekEnd = shiftCalendarDate(weekStart, 7);

    const count = visibleDatedActivities.filter(a => {
      const date = a.logDate.toISOString().slice(0, 10);
      return date >= weekStart && date < weekEnd;
    }).length;

    weeklyTrend.push(count);
  }

  const streaks = calculateStreaks(
    visibleDatedActivities.map(activity => activity.logDate.toISOString().slice(0, 10)),
    todayDate
  );

  return {
    timeZone,
    today: todayDate,
    totalActivities,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    bestDay,
    activeDaysThisMonth,
    heatmapData,
    heatmapGrid,
    monthLabels,
    weeklyTrend,
    projectDistribution,
    totalReports,
  };
}
