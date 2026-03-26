/**
 * Performance Dashboard Stats Cards
 *
 * Why: Encourages user engagement through gamification and psychological
 * principles (Goal-Gradient, Loss Aversion).
 *
 * Technical Implementation:
 * - Client-Side Streaks: Calculates streaks based on the user's local
 *   timezone to ensure that "Today" matches their actual calendar day,
 *   while using server-provided ISO strings for accuracy.
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

interface StatsProps {
  thisMonth: number;
  dates?: string[];
  projects: number;
  monthlyGoal: number;
  summaries?: number;
  serverDate?: string;
}

export function StatsCards({
  thisMonth,
  projects,
  monthlyGoal,
  summaries = 0,
  dates = [],
  serverDate,
}: StatsProps) {
  // Client-side streak calculation - server sends full ISO timestamps, we convert to local dates
  const currentStreak = useMemo(() => {
    if (!dates.length) return 0;

    // Convert full ISO timestamps to local YYYY-MM-DD strings
    const localDates = dates.map(d => new Date(d).toLocaleDateString('en-CA'));
    const uniqueDates = Array.from(new Set(localDates)).sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    // Get today and yesterday as YYYY-MM-DD in LOCAL timezone
    // Use serverDate as fallback to ensure consistency if provided
    const referenceDate = serverDate ? new Date(serverDate) : new Date();
    const today = referenceDate.toLocaleDateString('en-CA');
    const yesterday = new Date(referenceDate.getTime() - 86400000).toLocaleDateString('en-CA');

    // Check if the most recent activity is recent enough to count
    const latest = uniqueDates[0];

    // If latest activity is older than yesterday, streak is broken
    if (latest < yesterday) return 0;

    // Count consecutive days starting from the most recent
    let streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const current = uniqueDates[i - 1];
      const previous = uniqueDates[i];

      // Calculate expected previous day from current
      const currentDate = new Date(current + 'T12:00:00'); // Use noon to avoid DST issues
      const expectedPrevious = new Date(currentDate.getTime() - 86400000)
        .toISOString()
        .split('T')[0];

      if (previous === expectedPrevious) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [dates, serverDate]);

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
    if (count === 0) return 'Capture one concrete piece of work to start your record.';
    if (count >= goal) return 'Your record is in good shape this month.';
    if (remaining <= 3) return `${remaining} more entries would round out the month well.`;
    return `${remaining} more entries would make this month easier to summarize later.`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <FileText className="text-muted-foreground/70 h-4 w-4" />
              <span className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
                Activities
              </span>
            </div>
            <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
              {count}
            </p>
            <p className="text-muted-foreground/80 mb-4 text-xs">This month</p>

            {/* Goal-Gradient Progress */}
            <Progress value={progress} className="bg-muted/30 h-1.5 rounded-full" />
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">
          {count}/{goal} monthly target
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function CoverageStatCard({ streak }: { streak: number }) {
  const getMessage = () => {
    if (streak === 0) return 'No recent documentation streak yet.';
    if (streak === 1) return 'You captured work today. Keep the record alive tomorrow.';
    if (streak < 7) return 'You are building documentation consistency.';
    if (streak < 14) return 'This is becoming a reliable record, not a catch-up exercise.';
    return 'You have a strong habit of capturing evidence while it is fresh.';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <Flame
                className={`h-4 w-4 ${streak > 0 ? 'text-primary' : 'text-muted-foreground/70'}`}
              />
              <span className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
                Coverage
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
                {streak}
              </p>
              {streak > 3 && <TrendingUp className="text-primary h-4 w-4" />}
            </div>
            <p className="text-muted-foreground/80 text-xs">
              {streak === 1 ? 'Documented day' : 'Documented days'}
            </p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px]">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">Consistency improves recall and review quality.</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ProjectStatCard({ count, summaries }: { count: number; summaries: number }) {
  const getMessage = () => {
    if (count === 0) return 'Create a project so entries stay specific and reusable.';
    if (summaries === 0) return 'Your work is organized. Next step: turn it into a summary.';
    return 'Projects and summaries are working together as intended.';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 hover:bg-card/60 hover:shadow-primary/5 cursor-default rounded-2xl transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <FolderOpen className="text-muted-foreground/70 h-4 w-4" />
              <span className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
                Projects
              </span>
            </div>
            <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
              {count}
            </p>
            <p className="text-muted-foreground/80 text-xs">Active projects</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{getMessage()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
