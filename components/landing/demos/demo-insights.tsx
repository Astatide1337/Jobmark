"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardFrame } from "./dashboard-frame";
import { InsightsSummary } from "@/components/insights/insights-summary";
import { AiInsights } from "@/components/insights/ai-insights";
import { ContributionHeatmap } from "@/components/insights/contribution-heatmap";
import { ActivityCharts } from "@/components/insights/activity-charts";
import type { InsightsData } from "@/app/actions/insights";

export function DemoInsights() {
  // Mock Data that replicates the real data structure perfecty
  const mockData: InsightsData = {
    totalActivities: 342,
    totalReports: 12,
    activeDaysThisMonth: 18,
    currentStreak: 12,
    longestStreak: 15,
    bestDay: { date: "2023-11-15", count: 8 },
    heatmapData: generateMockHeatmap(),
    weeklyTrend: [12, 15, 8, 20, 18, 24, 16, 22, 28, 25, 30, 24],
    projectDistribution: [
        { name: "Website Redesign", count: 145, color: "#6366f1" },
        { name: "Mobile App MVP", count: 98, color: "#10b981" },
        { name: "Q1 Hiring Strategy", count: 45, color: "#f59e0b" },
        { name: "Sales Outreach", count: 32, color: "#ec4899" },
        { name: "Learning", count: 22, color: "#8b5cf6" },
    ]
  };

  return (
    <DashboardFrame activePath="/insights">
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Insights</h2>
                <p className="text-muted-foreground">Discover trends in your productivity.</p>
            </div>

            {/* Summary Cards */}
            <InsightsSummary data={mockData} />

            {/* AI Insights Card */}
            <AiInsights data={mockData} />

            {/* Heatmap */}
            <ContributionHeatmap data={mockData.heatmapData} />

            {/* Charts Row */}
            <ActivityCharts 
                weeklyTrend={mockData.weeklyTrend} 
                projectDistribution={mockData.projectDistribution} 
            />
        </div>
    </DashboardFrame>
  );
}

function generateMockHeatmap() {
    const data = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        // Randomize counts with some pattern
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        let count = 0;
        
        if (Math.random() > 0.4) {
             count = Math.floor(Math.random() * 5);
             if (!isWeekend && Math.random() > 0.3) count += 2; // More on weekdays
        }
        
        data.push({ date: dateStr, count });
    }
    return data;
}
