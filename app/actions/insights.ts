"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ProjectDistribution {
  name: string;
  count: number;
  color: string;
}

export interface InsightsData {
  totalActivities: number;
  currentStreak: number;
  longestStreak: number;
  bestDay: { date: string; count: number } | null;
  activeDaysThisMonth: number;
  heatmapData: HeatmapDataPoint[];
  weeklyTrend: number[];
  projectDistribution: ProjectDistribution[];
  totalReports: number;
}

export async function getInsightsData(): Promise<InsightsData> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Parallel queries for performance
  const [
    totalActivities,
    totalReports,
    thisMonthActivities,
    allActivities,
    projectsWithCounts,
  ] = await Promise.all([
    // Total activities count
    prisma.activity.count({
      where: { userId },
    }),
    // Total reports count
    prisma.report.count({
      where: { userId },
    }),
    // This month's activities (for active days)
    prisma.activity.findMany({
      where: {
        userId,
        logDate: { gte: startOfMonth },
      },
      select: { logDate: true },
    }),
    // All activities in the last year (for heatmap and streaks)
    prisma.activity.findMany({
      where: {
        userId,
        logDate: { gte: oneYearAgo },
      },
      select: { logDate: true, createdAt: true },
      orderBy: { logDate: "desc" },
    }),
    // Project distribution
    prisma.activity.groupBy({
      by: ["projectId"],
      where: { userId },
      _count: true,
    }),
  ]);

  // Get project details for distribution
  const projectIds = projectsWithCounts
    .map((p) => p.projectId)
    .filter((id): id is string => id !== null);
  
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, color: true },
  });

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Calculate project distribution
  const projectDistribution: ProjectDistribution[] = projectsWithCounts.map((item) => {
    const project = item.projectId ? projectMap.get(item.projectId) : null;
    return {
      name: project?.name || "Unassigned",
      count: item._count,
      color: project?.color || "#6b7280",
    };
  });

  // Calculate heatmap data
  const heatmapMap = new Map<string, number>();
  allActivities.forEach((activity) => {
    const dateStr = activity.logDate.toISOString().split("T")[0];
    heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1);
  });

  const heatmapData: HeatmapDataPoint[] = Array.from(heatmapMap.entries()).map(
    ([date, count]) => ({ date, count })
  );

  // Find best day
  let bestDay: { date: string; count: number } | null = null;
  heatmapData.forEach((day) => {
    if (!bestDay || day.count > bestDay.count) {
      bestDay = { date: day.date, count: day.count };
    }
  });

  // Calculate active days this month
  const thisMonthDates = new Set(
    thisMonthActivities.map((a) => a.logDate.toISOString().split("T")[0])
  );
  const activeDaysThisMonth = thisMonthDates.size;

  // Calculate weekly trend (last 12 weeks)
  const weeklyTrend: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);

    const count = allActivities.filter((a) => {
      const date = a.logDate;
      return date >= weekStart && date < weekEnd;
    }).length;

    weeklyTrend.push(count);
  }

  // Calculate current streak using createdAt for reliability
  const uniqueDates = Array.from(
    new Set(allActivities.map((a) => a.createdAt.toLocaleDateString("en-CA")))
  ).sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    const latest = uniqueDates[0];

    if (latest >= yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const current = uniqueDates[i - 1];
        const previous = uniqueDates[i];
        const currentDate = new Date(current + "T12:00:00");
        const expectedPrevious = new Date(currentDate.getTime() - 86400000)
          .toISOString()
          .split("T")[0];
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
      const prev = new Date(sortedDates[i - 1] + "T12:00:00");
      const curr = new Date(sortedDates[i] + "T12:00:00");
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
    weeklyTrend,
    projectDistribution,
    totalReports,
  };
}
