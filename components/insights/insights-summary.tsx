/**
 * Analytics Summary Metrics
 *
 * Why: Highlights the most important "Headline" stats for the user.
 * Provides immediate feedback on Total Wins, Best Days, and Active Streaks.
 *
 * Interaction: Every card features a helpful tooltip that explains
 * *what* the number represents and provides a personal record (e.g.,
 * "Longest streak: X days").
 */
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Flame, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InsightsData } from '@/app/actions/insights';

interface InsightsSummaryProps {
  data: InsightsData;
}

// Consistent card styling applied globally
const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-md';

export function InsightsSummary({ data }: InsightsSummaryProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          subtitle={data.currentStreak === 1 ? 'Day' : 'Days'}
          tooltip={`Longest streak: ${data.longestStreak} days`}
          highlight={data.currentStreak > 0}
        />
        <MetricCard
          icon={Trophy}
          label="Best Day"
          value={data.bestDay?.count ?? 0}
          subtitle={data.bestDay ? formatDate(data.bestDay.date) : 'No data yet'}
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
        <Card
          className={cn(
            CARD_STYLES,
            'cursor-default transition-all duration-300',
            'hover:bg-card/60 hover:border-border/60 hover:shadow-primary/5 hover:shadow-xl'
          )}
        >
          <CardContent className="p-5">
            {/* Header row - icon left, label right */}
            <div className="mb-3 flex items-center justify-between">
              <Icon
                className={cn('h-4 w-4', highlight ? 'text-primary' : 'text-muted-foreground/70')}
              />
              <span className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
                {label}
              </span>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2">
              <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
                {value}
              </p>
              {highlight && value > 3 && <TrendingUp className="text-primary h-4 w-4" />}
            </div>

            {/* Subtitle */}
            <p className="text-muted-foreground/80 mt-1 text-xs">{subtitle}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="border-border/50 rounded-xl font-medium shadow-xl backdrop-blur-md"
      >
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
