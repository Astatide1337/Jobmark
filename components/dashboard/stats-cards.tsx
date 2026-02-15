"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Flame, FolderOpen, TrendingUp } from "lucide-react";

/**
 * Stats Dashboard with UI/UX Psychology
 * 
 * Principles Applied:
 * 1. Goal-Gradient: Progress bar shows momentum toward monthly goal
 * 2. Loss Aversion: Streak protection messaging
 * 3. Variable Rewards: Milestone messages
 */

import { useMemo } from "react";

interface StatsProps {
  thisMonth: number;
  dates?: string[];
  projects: number;
  monthlyGoal: number;
}

export function StatsCards({ thisMonth, projects, monthlyGoal, dates = [] }: StatsProps) {
  // Client-side streak calculation - server sends full ISO timestamps, we convert to local dates
  const currentStreak = useMemo(() => {
    if (!dates.length) return 0;

    // Convert full ISO timestamps to local YYYY-MM-DD strings
    const localDates = dates.map(d => new Date(d).toLocaleDateString("en-CA"));
    const uniqueDates = Array.from(new Set(localDates)).sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    // Get today and yesterday as YYYY-MM-DD in LOCAL timezone
    const today = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

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
        const currentDate = new Date(current + "T12:00:00"); // Use noon to avoid DST issues
        const expectedPrevious = new Date(currentDate.getTime() - 86400000)
            .toISOString().split('T')[0];
        
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    if (count === 0) return "Log your first win today";
    if (count >= goal) return "Goal achieved! Keep going";
    if (remaining <= 3) return `Almost there! ${remaining} to go`;
    return `${remaining} more to reach your goal`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 cursor-default transition-all duration-300 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <FileText className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                Activities
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{count}</p>
            <p className="text-xs text-muted-foreground/80 mb-4">This month</p>
            
            {/* Goal-Gradient Progress */}
            <Progress value={progress} className="h-1.5 rounded-full bg-muted/30" />
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{getMessage()}</p>
        <p className="text-muted-foreground">{count}/{goal} monthly goal</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StreakStatCard({ streak }: { streak: number }) {
  const isAtRisk = streak > 0;
  
  const getMessage = () => {
    if (streak === 0) return "Log today to start a streak";
    if (streak === 1) return "Streak started! Come back tomorrow";
    if (streak < 7) return "Building a habit";
    if (streak < 14) return "One week strong";
    if (streak < 30) return "Two weeks of consistency";
    return "Unstoppable";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 cursor-default transition-all duration-300 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Flame className={`h-4 w-4 ${streak > 0 ? "text-primary" : "text-muted-foreground/70"}`} />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                Streak
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{streak}</p>
              {streak > 3 && (
                <TrendingUp className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground/80">
              {streak === 1 ? "Day" : "Days"}
            </p>
            
            {isAtRisk && (
              <div className="flex items-center gap-1.5 mt-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Active</span>
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
    if (count === 0) return "Create a project to organize activities";
    if (count === 1) return "Great start!";
    return "Well organized";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="bg-card/40 border-border/40 cursor-default transition-all duration-300 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                Projects
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{count}</p>
            <p className="text-xs text-muted-foreground/80">Active</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{getMessage()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
