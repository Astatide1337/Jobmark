/**
 * Insights & Analytics Actions
 *
 * Why: To stay motivated, users need to see their progress visualized.
 * This action performs heavy data aggregation to build the "Yearly Heatmap"
 * and "Project Distribution" charts.
 *
 * Performance Strategy (Server-Side Crunching):
 * We perform the complex grid calculations (mapping 365 days of activities
 * to week-based arrays) on the server. This ensures the client receives
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
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  getCalendarRange,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';

export interface ProjectDistribution {
  name: string;
  count: number;
  color: string;
}

export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  dayOfWeek: number;
}

export interface MonthLabel {
  month: string;
  weekIndex: number;
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
  const oneYearAgo = calendarDateToUtcMidnight(shiftCalendarDate(todayDate, -364));

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
      // All activities in the last year (for heatmap and streaks)
      prisma.activity.findMany({
        where: {
          userId: targetUserId,
          logDate: { gte: oneYearAgo },
          ...lockedFilter,
        },
        select: { logDate: true, createdAt: true },
        orderBy: { logDate: 'desc' },
      }),
      // Project distribution
      prisma.activity.groupBy({
        by: ['projectId'],
        where: { userId: targetUserId, ...lockedFilter },
        _count: true,
      }),
    ]);

  // Get project details for distribution
  const projectIds = projectsWithCounts
    .map(p => p.projectId)
    .filter((id): id is string => id !== null);

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, color: true },
  });

  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Calculate project distribution
  const projectDistribution: ProjectDistribution[] = projectsWithCounts.map(item => {
    const project = item.projectId ? projectMap.get(item.projectId) : null;
    return {
      name: project?.name || 'Unassigned',
      count: item._count,
      color: project?.color || '#a89888',
    };
  });

  // Calculate heatmap data
  const heatmapMap = new Map<string, number>();
  allActivities.forEach(activity => {
    const dateStr = activity.logDate.toISOString().slice(0, 10);
    heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1);
  });

  // Calculate grid (weeks of days)
  const days: HeatmapDay[] = [];
  const today = todayDate;
  for (let i = 364; i >= 0; i--) {
    const dateStr = shiftCalendarDate(today, -i);
    const date = calendarDateToUtcMidnight(dateStr);
    days.push({
      date: dateStr,
      count: heatmapMap.get(dateStr) || 0,
      dayOfWeek: date.getUTCDay(),
    });
  }

  const heatmapData: HeatmapDataPoint[] = Array.from(heatmapMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const heatmapGrid: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: -1, dayOfWeek: i });
  }

  days.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      heatmapGrid.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    heatmapGrid.push(currentWeek);
  }

  // Calculate month labels
  const monthLabels: MonthLabel[] = [];
  let lastMonth = '';
  heatmapGrid.forEach((week, weekIndex) => {
    const validDays = week.filter(d => d.date);
    if (validDays.length > 0) {
      const firstDate = validDays[0].date;
      const month = firstDate.slice(0, 7);
      if (month !== lastMonth) {
        monthLabels.push({
          month: new Date(`${firstDate}T00:00:00Z`).toLocaleDateString('en-US', {
            month: 'short',
            timeZone: 'UTC',
          }),
          weekIndex,
        });
        lastMonth = month;
      }
    }
  });

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
  for (let i = 11; i >= 0; i--) {
    const weekEnd = shiftCalendarDate(todayDate, -i * 7);
    const weekStart = shiftCalendarDate(weekEnd, -7);

    const count = allActivities.filter(a => {
      const date = a.logDate.toISOString().slice(0, 10);
      return date >= weekStart && date < weekEnd;
    }).length;

    weeklyTrend.push(count);
  }

  // Streaks use the represented calendar date, so backdated entries behave
  // consistently with reports, heatmaps, and goal totals.
  const uniqueDates = Array.from(
    new Set(allActivities.map(a => a.logDate.toISOString().slice(0, 10)))
  ).sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  if (uniqueDates.length > 0) {
    const yesterday = shiftCalendarDate(todayDate, -1);
    const latest = uniqueDates[0];

    if (latest >= yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const current = uniqueDates[i - 1];
        const previous = uniqueDates[i];
        const expectedPrevious = shiftCalendarDate(current, -1);
        if (previous === expectedPrevious) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Calculate longest streak (simplified - check all consecutive sequences)
  let longestStreak = currentStreak;
  let tempStreak = 0;
  const sortedDates = [...uniqueDates].sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      if (shiftCalendarDate(sortedDates[i - 1], 1) === sortedDates[i]) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return {
    timeZone,
    today: todayDate,
    totalActivities,
    currentStreak,
    longestStreak,
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
