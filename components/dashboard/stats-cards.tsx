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
  serverDate?: string;
}

export function StatsCards({
  thisMonth,
  projects,
  monthlyGoal,
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
  }, [dates]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActivityStatCard count={thisMonth} goal={monthlyGoal} />
        <StreakStatCard streak={currentStreak} />
        <ProjectStatCard count={projects} />
      </div>
    </TooltipProvider>
  );
}

function ActivityStatCard({ count, goal }: { count: number; goal: number }) {
  const progress = Math.min((count / goal) * 100, 100);
  const remaining = Math.max(goal - count, 0);

  const getMessage = () => {
    if (count === 0) return 'Log your first win today';
    if (count >= goal) return 'Goal achieved! Keep going';
    if (remaining <= 3) return `Almost there! ${remaining} to go`;
    return `${remaining} more to reach your goal`;
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
          {count}/{goal} monthly goal
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function StreakStatCard({ streak }: { streak: number }) {
  const isAtRisk = streak > 0;

  const getMessage = () => {
    if (streak === 0) return 'Log today to start a streak';
    if (streak === 1) return 'Streak started! Come back tomorrow';
    if (streak < 7) return 'Building a habit';
    if (streak < 14) return 'One week strong';
    if (streak < 30) return 'Two weeks of consistency';
    return 'Unstoppable';
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
                Streak
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
                {streak}
              </p>
              {streak > 3 && <TrendingUp className="text-primary h-4 w-4" />}
            </div>
            <p className="text-muted-foreground/80 text-xs">{streak === 1 ? 'Day' : 'Days'}</p>

            {isAtRisk && (
              <div className="mt-3 flex items-center gap-1.5">
                <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                  Active
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px]">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">Don't break the chain</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ProjectStatCard({ count }: { count: number }) {
  const getMessage = () => {
    if (count === 0) return 'Create a project to organize activities';
    if (count === 1) return 'Great start!';
    return 'Well organized';
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
            <p className="text-muted-foreground/80 text-xs">Active</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{getMessage()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
