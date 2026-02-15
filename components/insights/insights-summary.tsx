"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Flame, Trophy, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsightsData } from "@/app/actions/insights";

interface InsightsSummaryProps {
  data: InsightsData;
}

// Consistent card styling applied globally
const CARD_STYLES = "rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-md";

export function InsightsSummary({ data }: InsightsSummaryProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label="Activities"
          value={data.totalActivities}
          subtitle="All time"
          tooltip="Total activities logged since you started"
        />
        <MetricCard
          icon={Flame}
          label="Streak"
          value={data.currentStreak}
          subtitle={data.currentStreak === 1 ? "Day" : "Days"}
          tooltip={`Longest streak: ${data.longestStreak} days`}
          highlight={data.currentStreak > 0}
        />
        <MetricCard
          icon={Trophy}
          label="Best Day"
          value={data.bestDay?.count ?? 0}
          subtitle={data.bestDay ? formatDate(data.bestDay.date) : "No data yet"}
          tooltip="Your most productive day"
        />
        <MetricCard
          icon={Calendar}
          label="Active"
          value={data.activeDaysThisMonth}
          subtitle="This month"
          tooltip="Days with at least one activity logged"
        />
      </div>
    </TooltipProvider>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtitle: string;
  tooltip: string;
  highlight?: boolean;
}

function MetricCard({ icon: Icon, label, value, subtitle, tooltip, highlight }: MetricCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          CARD_STYLES,
          "cursor-default transition-all duration-300",
          "hover:bg-card/60 hover:border-border/60 hover:shadow-xl hover:shadow-primary/5"
        )}>
          <CardContent className="p-5">
            {/* Header row - icon left, label right */}
            <div className="flex items-center justify-between mb-3">
              <Icon className={cn(
                "h-4 w-4",
                highlight ? "text-primary" : "text-muted-foreground/70"
              )} />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                {label}
              </span>
            </div>
            
            {/* Value */}
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {value}
              </p>
              {highlight && value > 3 && (
                <TrendingUp className="h-4 w-4 text-primary" />
              )}
            </div>
            
            {/* Subtitle */}
            <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="rounded-xl border-border/50 shadow-xl backdrop-blur-md font-medium">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
