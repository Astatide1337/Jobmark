/**
 * Performance Dashboard Stats Cards
 *
 * Why: Encourages user engagement through gamification and psychological
 * principles (Goal-Gradient, Loss Aversion).
 *
 * Technical Implementation:
 * - Server-aligned streaks: The server sends date-only values and the
 *   user's persisted calendar date, so browser timezone cannot shift a day.
 * - Progress Tracking: Visualizes the "Monthly Activity Goal" to build momentum.
 */
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Flame, FolderOpen, TrendingUp } from 'lucide-react';

/**
 * Stats Dashboard with UI/UX Psychology
 *
 * Principles Applied:
 * 1. Goal-Gradient: Progress bar shows momentum toward monthly goal
 * 2. Loss Aversion: Streak protection messaging
 * 3. Variable Rewards: Milestone messages
 */

import { useMemo } from 'react';
import { shiftCalendarDate } from '@/lib/date-semantics';

interface StatsProps {
  thisMonth: number;
  dates?: string[];
  projects: number;
  monthlyGoal: number;
  summaries?: number;
  today: string;
}

export function StatsCards({
  thisMonth,
  projects,
  monthlyGoal,
  summaries = 0,
  dates = [],
  today,
}: StatsProps) {
  const currentStreak = useMemo(() => {
    if (!dates.length) return 0;

    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    const yesterday = shiftCalendarDate(today, -1);

    // Check if the most recent activity is recent enough to count
    const latest = uniqueDates[0];

    // If latest activity is older than yesterday, streak is broken
    if (latest < yesterday) return 0;

    // Count consecutive days starting from the most recent
    let streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const current = uniqueDates[i - 1];
      const previous = uniqueDates[i];

      const expectedPrevious = shiftCalendarDate(current, -1);

      if (previous === expectedPrevious) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [dates, today]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActivityStatCard count={thisMonth} goal={monthlyGoal} />
        <CoverageStatCard streak={currentStreak} />
        <ProjectStatCard count={projects} summaries={summaries} />
      </div>
    </TooltipProvider>
  );
}

function ActivityStatCard({ count, goal }: { count: number; goal: number }) {
  const progress = Math.min((count / goal) * 100, 100);
  const remaining = Math.max(goal - count, 0);

  const getMessage = () => {
    if (count === 0) return 'Add one note to get started.';
    if (count >= goal) return 'You reached your note goal this month.';
    if (remaining <= 3) return `${remaining} more notes will reach your goal.`;
    return `${remaining} more notes will help with your monthly review.`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-[background-color,box-shadow] duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <FileText className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                Notes
              </span>
            </div>
            <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
              {count}
            </p>
            <p className="text-muted-foreground mb-4 text-xs">This month</p>

            {/* Goal-Gradient Progress */}
            <Progress
              value={progress}
              aria-label={`Monthly note target: ${count} of ${goal}`}
              className="bg-muted/30 h-1.5 rounded-full"
            />
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">
          Monthly goal: {count} of {goal}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function CoverageStatCard({ streak }: { streak: number }) {
  const getMessage = () => {
    if (streak === 0) return 'No notes from the last few days.';
    if (streak === 1) return 'You added a note today.';
    return `You have notes for ${streak} days in a row.`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-[background-color,box-shadow] duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <Flame
                className={`h-4 w-4 ${streak > 0 ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                Days with notes
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
                {streak}
              </p>
              {streak > 3 && <TrendingUp className="text-primary h-4 w-4" />}
            </div>
            <p className="text-muted-foreground text-xs">
              {streak === 1 ? 'Day with a note' : 'Days with notes'}
            </p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px]">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">Your notes make reviews easier to write.</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ProjectStatCard({ count, summaries }: { count: number; summaries: number }) {
  const getMessage = () => {
    if (count === 0) return 'Create a project to keep related notes together.';
    if (summaries === 0) return 'Your notes are grouped. Next step: build a review draft.';
    return 'Your projects and review drafts are ready.';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-[background-color,box-shadow] duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <FolderOpen className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                Projects
              </span>
            </div>
            <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
              {count}
            </p>
            <p className="text-muted-foreground text-xs">Active projects</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{getMessage()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
