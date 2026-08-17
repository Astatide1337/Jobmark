'use client';

import { useState, useMemo } from 'react';
import { InsightsSummary } from '@/components/insights/insights-summary';
import { ContributionHeatmap } from '@/components/insights/contribution-heatmap';
import { ActivityCharts } from '@/components/insights/activity-charts';
import { AiInsights } from '@/components/insights/ai-insights';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HeatmapDay, InsightsData, MonthLabel } from '@/app/actions/insights';
import { shiftCalendarDate } from '@/lib/date-semantics';

type DateRange = '7d' | '30d' | '90d' | '365d' | 'all';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

interface InsightsClientProps {
  initialData: InsightsData;
}

export function InsightsClient({ initialData }: InsightsClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filteredData = useMemo(() => {
    const rangeStart = getDateRangeStart(dateRange, initialData.today);

    if (!rangeStart) {
      return initialData;
    }

    // Filter heatmap data
    const rangeStartKey = rangeStart;
    const latestDateKey = initialData.today;
    const filteredHeatmap = initialData.heatmapData.filter(
      d => d.date >= rangeStartKey && d.date <= latestDateKey
    );

    // Calculate filtered stats
    const filteredActivities = filteredHeatmap.reduce((sum, d) => sum + d.count, 0);
    const filteredActiveDays = filteredHeatmap.filter(d => d.count > 0).length;

    // Recalculate best day for filtered period
    let bestDay: InsightsData['bestDay'] = null;
    if (filteredHeatmap.length > 0) {
      const best = filteredHeatmap.reduce((a, b) => (a.count > b.count ? a : b));
      if (best.count > 0) {
        bestDay = { date: best.date, count: best.count };
      }
    }

    const { heatmapGrid, monthLabels } = buildHeatmapGrid(
      filteredHeatmap,
      rangeStartKey,
      latestDateKey
    );

    // Filter weekly trend based on range
    let weeklyTrend = initialData.weeklyTrend;
    if (dateRange === '7d') {
      weeklyTrend = initialData.weeklyTrend.slice(-2);
    } else if (dateRange === '30d') {
      weeklyTrend = initialData.weeklyTrend.slice(-5);
    } else if (dateRange === '90d') {
      weeklyTrend = initialData.weeklyTrend.slice(-13);
    }

    return {
      ...initialData,
      totalActivities: dateRange === 'all' ? initialData.totalActivities : filteredActivities,
      activeDaysThisMonth:
        dateRange === 'all' ? initialData.activeDaysThisMonth : filteredActiveDays,
      heatmapData: filteredHeatmap,
      heatmapGrid,
      monthLabels,
      weeklyTrend,
      bestDay,
    };
  }, [dateRange, initialData]);

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Your notes</h2>
          <p className="text-muted-foreground text-sm">
            See how often you add notes and which projects they cover.
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <InsightsSummary
        data={filteredData}
        rangeLabel={dateRange === 'all' ? 'this month' : 'selected range'}
      />

      {/* AI Insights */}
      <AiInsights data={filteredData} />

      {/* Contribution Heatmap */}
      <ContributionHeatmap
        weeks={filteredData.heatmapGrid}
        monthLabels={filteredData.monthLabels}
        today={filteredData.today}
      />

      {/* Charts Section */}
      <ActivityCharts
        weeklyTrend={filteredData.weeklyTrend}
        projectDistribution={filteredData.projectDistribution}
      />
    </div>
  );
}

function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={v => onChange(v as DateRange)}>
      <SelectTrigger className="h-9 w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getDateRangeStart(range: DateRange, today: string): string | null {
  if (range === 'all') return null;

  const daysMap: Record<Exclude<DateRange, 'all'>, number> = {
    '7d': 6,
    '30d': 29,
    '90d': 89,
    '365d': 364,
  };

  return shiftCalendarDate(today, -daysMap[range]);
}

function buildHeatmapGrid(
  data: InsightsData['heatmapData'],
  startDate: string,
  endDate: string
): { heatmapGrid: HeatmapDay[][]; monthLabels: MonthLabel[] } {
  const counts = new Map(data.map(day => [day.date, day.count]));
  const days: HeatmapDay[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    days.push({
      date,
      count: counts.get(date) ?? 0,
      dayOfWeek: cursor.getUTCDay(),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const heatmapGrid: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: -1, dayOfWeek: i });
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      heatmapGrid.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) heatmapGrid.push(currentWeek);

  const monthLabels: MonthLabel[] = [];
  let lastMonth = '';
  heatmapGrid.forEach((week, weekIndex) => {
    const firstDay = week.find(day => day.date);
    if (!firstDay) return;
    const monthKey = firstDay.date.slice(0, 7);
    if (monthKey === lastMonth) return;
    monthLabels.push({
      month: new Date(`${firstDay.date}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      }),
      weekIndex,
    });
    lastMonth = monthKey;
  });

  return { heatmapGrid, monthLabels };
}
