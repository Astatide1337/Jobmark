/**
 * Interactive Insights Demo
 *
 * Why: Showcases the data visualization capabilities of jobmark. It
 * replicates the exact data structure of the real Insights page but
 * uses high-fidelity mock data to ensure privacy and performance.
 *
 * Logic: Includes a specialized `generateMockHeatmapData` function
 * that simulates a realistic year of activity (including weekend dips)
 * to demonstrate the value of the heatmap visual.
 */
'use client';

import { DashboardFrame } from './dashboard-frame';
import { InsightsSummary } from '@/components/insights/insights-summary';
import { AiInsights } from '@/components/insights/ai-insights';
import { ContributionHeatmap } from '@/components/insights/contribution-heatmap';
import { ActivityCharts } from '@/components/insights/activity-charts';
import type { InsightsData, HeatmapDay, MonthLabel } from '@/app/actions/insights';

export function DemoInsights() {
  const { heatmapData, heatmapGrid, monthLabels } = generateMockHeatmapData();

  // Mock Data that replicates the real data structure perfecty
  const mockData: InsightsData = {
    totalActivities: 342,
    totalReports: 12,
    activeDaysThisMonth: 18,
    currentStreak: 12,
    longestStreak: 15,
    bestDay: { date: '2023-11-15', count: 8 },
    heatmapData,
    heatmapGrid,
    monthLabels,
    weeklyTrend: [12, 15, 8, 20, 18, 24, 16, 22, 28, 25, 30, 24],
    projectDistribution: [
      { name: 'Website Redesign', count: 145, color: '#6366f1' },
      { name: 'Mobile App MVP', count: 98, color: '#10b981' },
      { name: 'Q1 Hiring Strategy', count: 45, color: '#f59e0b' },
      { name: 'Sales Outreach', count: 32, color: '#ec4899' },
      { name: 'Learning', count: 22, color: '#8b5cf6' },
    ],
  };

  return (
    <DashboardFrame activePath="/insights">
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Insights</h2>
          <p className="text-muted-foreground">Discover trends in your productivity.</p>
        </div>

        {/* Summary Cards */}
        <InsightsSummary data={mockData} />

        {/* AI Insights Card */}
        <AiInsights data={mockData} />

        {/* Heatmap */}
        <ContributionHeatmap weeks={mockData.heatmapGrid} monthLabels={mockData.monthLabels} />

        {/* Charts Row */}
        <ActivityCharts
          weeklyTrend={mockData.weeklyTrend}
          projectDistribution={mockData.projectDistribution}
        />
      </div>
    </DashboardFrame>
  );
}

/**
 * Seeded pseudo-random number generator (Mulberry32 algorithm).
 *
 * Why: `Math.random()` produces different values on server (SSR) vs client
 * (hydration), causing React hydration mismatches. A seeded PRNG with a
 * fixed seed always produces the same sequence — same on server and client.
 */
function makePrng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockHeatmapData() {
  // Fixed seed → identical data on every render (server + client)
  const random = makePrng(0xdeadbeef);

  const rawData = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    let count = 0;
    if (random() > 0.4) {
      count = Math.floor(random() * 5);
      if (!isWeekend && random() > 0.3) count += 2;
    }

    rawData.push({
      date: dateStr,
      count,
      dayOfWeek: date.getDay(),
    });
  }

  const heatmapGrid: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  const firstDayOfWeek = rawData[0]?.dayOfWeek ?? 0;

  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: -1, dayOfWeek: i });
  }

  rawData.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      heatmapGrid.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    heatmapGrid.push(currentWeek);
  }

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

  return {
    heatmapData: rawData.map(d => ({ date: d.date, count: d.count })),
    heatmapGrid,
    monthLabels,
  };
}
