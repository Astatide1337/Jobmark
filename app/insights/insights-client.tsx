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
import type { InsightsData } from '@/app/actions/insights';

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
    const rangeStart = getDateRangeStart(dateRange);

    if (!rangeStart) {
      return initialData;
    }

    // Filter heatmap data
    const filteredHeatmap = initialData.heatmapData.filter(d => {
      const date = new Date(d.date);
      return date >= rangeStart;
    });

    // Calculate filtered stats
    const filteredActivities = filteredHeatmap.reduce((sum, d) => sum + d.count, 0);
    const filteredActiveDays = filteredHeatmap.filter(d => d.count > 0).length;

    // Recalculate best day for filtered period
    let bestDay = initialData.bestDay;
    if (filteredHeatmap.length > 0) {
      const best = filteredHeatmap.reduce((a, b) => (a.count > b.count ? a : b));
      if (best.count > 0) {
        bestDay = { date: best.date, count: best.count };
      }
    }

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
      weeklyTrend,
      bestDay,
    };
  }, [dateRange, initialData]);

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-semibold">Your Activity</h2>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <InsightsSummary data={filteredData} />

      {/* AI Insights */}
      <AiInsights data={filteredData} />

      {/* Contribution Heatmap */}
      <ContributionHeatmap data={filteredData.heatmapData} />

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

function getDateRangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;

  const now = new Date();
  const daysMap: Record<Exclude<DateRange, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365,
  };

  const start = new Date();
  start.setDate(now.getDate() - daysMap[range]);
  start.setHours(0, 0, 0, 0);
  return start;
}
