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

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, buildLockedActivityFilter } from '@/lib/project-lock';

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

export async function getInsightsData(userId?: string): Promise<InsightsData> {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    targetUserId = session.user.id;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const lockedIds = await getLockedProjectIds(targetUserId);
  const lockedFilter = buildLockedActivityFilter(lockedIds);

  // Parallel queries for performance
  const [totalActivities, totalReports, thisMonthActivities, allActivities, projectsWithCounts] =
    await Promise.all([
      // Total activities count
      prisma.activity.count({
        where: { userId: targetUserId, ...lockedFilter },
      }),
      // Total reports count
      prisma.report.count({
        where: { userId: targetUserId },
      }),
      // This month's activities (for active days)
      prisma.activity.findMany({
        where: {
          userId: targetUserId,
          logDate: { gte: startOfMonth },
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
      color: project?.color || '#6b7280',
    };
  });

  // Calculate heatmap data
  const heatmapMap = new Map<string, number>();
  allActivities.forEach(activity => {
    const dateStr = activity.logDate.toISOString().split('T')[0];
    heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1);
  });

  // Calculate grid (weeks of days)
  const days: HeatmapDay[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: heatmapMap.get(dateStr) || 0,
      dayOfWeek: date.getDay(),
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
  let lastMonth = -1;
  heatmapGrid.forEach((week, weekIndex) => {
    const validDays = week.filter(d => d.date);
    if (validDays.length > 0) {
      const firstDay = new Date(validDays[0].date);
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          month: firstDay.toLocaleDateString('en-US', { month: 'short' }),
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
    thisMonthActivities.map(a => a.logDate.toISOString().split('T')[0])
  );
  const activeDaysThisMonth = thisMonthDates.size;

  // Calculate weekly trend (last 12 weeks)
  const weeklyTrend: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);

    const count = allActivities.filter(a => {
      const date = a.logDate;
      return date >= weekStart && date < weekEnd;
    }).length;

    weeklyTrend.push(count);
  }

  // Calculate current streak using createdAt for reliability
  const uniqueDates = Array.from(
    new Set(allActivities.map(a => a.createdAt.toLocaleDateString('en-CA')))
  ).sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    const latest = uniqueDates[0];

    if (latest >= yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const current = uniqueDates[i - 1];
        const previous = uniqueDates[i];
        const currentDate = new Date(current + 'T12:00:00');
        const expectedPrevious = new Date(currentDate.getTime() - 86400000)
          .toISOString()
          .split('T')[0];
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
      const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
      const curr = new Date(sortedDates[i] + 'T12:00:00');
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return {
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
