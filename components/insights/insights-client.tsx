"use client";

import { useState, useEffect } from "react";
import { InsightsSummary } from "@/components/insights/insights-summary";
import { ContributionHeatmap } from "@/components/insights/contribution-heatmap";
import { ActivityCharts } from "@/components/insights/activity-charts";
import { AiInsights } from "@/components/insights/ai-insights";
import { DateRangeFilter, type DateRange, getDateRangeStart } from "@/components/insights/date-range-filter";
import type { InsightsData } from "@/app/actions/insights";

interface InsightsClientProps {
  initialData: InsightsData;
}

export function InsightsClient({ initialData }: InsightsClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [filteredData, setFilteredData] = useState<InsightsData>(initialData);

  // Filter data based on date range
  useEffect(() => {
    const rangeStart = getDateRangeStart(dateRange);
    
    if (!rangeStart) {
      // "All time" - use original data
      setFilteredData(initialData);
      return;
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
      const best = filteredHeatmap.reduce((a, b) => a.count > b.count ? a : b);
      if (best.count > 0) {
        bestDay = { date: best.date, count: best.count };
      }
    }

    // Filter weekly trend based on range
    let weeklyTrend = initialData.weeklyTrend;
    if (dateRange === "7d") {
      weeklyTrend = initialData.weeklyTrend.slice(-2);
    } else if (dateRange === "30d") {
      weeklyTrend = initialData.weeklyTrend.slice(-5);
    } else if (dateRange === "90d") {
      weeklyTrend = initialData.weeklyTrend.slice(-13);
    }

    // Filter project distribution (can't easily filter without server)
    // Keep original project distribution for now

    setFilteredData({
      ...initialData,
      totalActivities: dateRange === "all" ? initialData.totalActivities : filteredActivities,
      activeDaysThisMonth: dateRange === "all" ? initialData.activeDaysThisMonth : filteredActiveDays,
      heatmapData: filteredHeatmap,
      weeklyTrend,
      bestDay,
    });
  }, [dateRange, initialData]);

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your Activity</h2>
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
