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
import { FileText, Calendar, FolderOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InsightsData } from '@/app/actions/insights';

interface InsightsSummaryProps {
  data: InsightsData;
  compact?: boolean;
  rangeLabel?: 'this month' | 'selected range';
}

// Consistent card styling applied globally
const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-md';

export function InsightsSummary({
  data,
  compact = false,
  rangeLabel = 'this month',
}: InsightsSummaryProps) {
  const activeDaysSubtitle =
    rangeLabel === 'this month'
      ? 'Days with notes this month'
      : 'Days with notes in selected range';
  const activeDaysTooltip =
    rangeLabel === 'this month'
      ? 'Days this month when you saved at least one note'
      : 'Days in the selected range when you saved at least one note';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('grid grid-cols-2 gap-4', !compact && 'lg:grid-cols-4')}>
        <MetricCard
          icon={FileText}
          label="Notes"
          value={data.totalActivities}
          subtitle="All notes"
          tooltip="All the notes you have saved"
        />
        <MetricCard
          icon={Calendar}
          label="Days with notes"
          value={data.activeDaysThisMonth}
          subtitle={activeDaysSubtitle}
          tooltip={activeDaysTooltip}
          highlight={data.activeDaysThisMonth > 5}
        />
        <MetricCard
          icon={FolderOpen}
          label="Projects"
          value={data.projectDistribution.length}
          subtitle="With notes"
          tooltip="Projects that have notes"
        />
        <MetricCard
          icon={Sparkles}
          label="Review drafts"
          value={data.totalReports}
          subtitle="Saved drafts"
          tooltip="Review drafts you have saved"
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
            'cursor-default transition-[background-color,border-color,box-shadow] duration-300',
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
