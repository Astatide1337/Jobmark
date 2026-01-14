"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, Calendar, Clock, Target, Lightbulb } from "lucide-react";
import type { InsightsData } from "@/app/actions/insights";

interface AiInsightsProps {
  data: InsightsData;
}

// Consistent card styling
const CARD_STYLES = "rounded-2xl border border-border/40 bg-card/60 shadow-sm";

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "tip";
}

export function AiInsights({ data }: AiInsightsProps) {
  const insights = useMemo(() => generateInsights(data), [data]);

  const iconColors = {
    info: "text-blue-400",
    success: "text-green-400",
    warning: "text-amber-400",
    tip: "text-primary",
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="pb-3 px-6 pt-6">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div className={`shrink-0 mt-0.5 ${iconColors[insight.type]}`}>
                {insight.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{insight.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 col-span-2">
              Log more activities to unlock personalized insights.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function generateInsights(data: InsightsData): Insight[] {
  const insights: Insight[] = [];

  // 1. Day of week analysis - find most productive day
  const dayOfWeekCounts = new Map<number, number>();
  data.heatmapData.forEach(d => {
    const date = new Date(d.date + "T12:00:00");
    const day = date.getDay();
    dayOfWeekCounts.set(day, (dayOfWeekCounts.get(day) || 0) + d.count);
  });

  if (dayOfWeekCounts.size > 0) {
    const sortedDays = Array.from(dayOfWeekCounts.entries()).sort((a, b) => b[1] - a[1]);
    const [bestDay, bestCount] = sortedDays[0];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    if (bestCount > 0) {
      const isWeekend = bestDay === 0 || bestDay === 6;
      insights.push({
        icon: <Calendar className="h-4 w-4" />,
        title: `${dayNames[bestDay]}s are your power day`,
        description: isWeekend 
          ? `You're most productive on weekends. Consider protecting this time for deep work.`
          : `${dayNames[bestDay]} typically sees the most activity. Schedule important tasks for this day.`,
        type: "tip",
      });
    }

    // Find least productive weekday (for improvement suggestion)
    const weekdayOnly = sortedDays.filter(([day]) => day !== 0 && day !== 6);
    if (weekdayOnly.length >= 3) {
      const worstWeekday = weekdayOnly[weekdayOnly.length - 1];
      if (worstWeekday[1] < bestCount * 0.3) {
        insights.push({
          icon: <Lightbulb className="h-4 w-4" />,
          title: `${dayNames[worstWeekday[0]]}s need attention`,
          description: `Your ${dayNames[worstWeekday[0]]} activity is notably lower. Try scheduling a recurring task to build momentum.`,
          type: "warning",
        });
      }
    }
  }

  // 2. Trend Analysis - compare recent vs earlier periods
  if (data.weeklyTrend.length >= 6) {
    const recentWeeks = data.weeklyTrend.slice(-3);
    const olderWeeks = data.weeklyTrend.slice(-6, -3);
    
    const avgRecent = recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
    const avgOlder = olderWeeks.reduce((a, b) => a + b, 0) / olderWeeks.length;
    
    if (avgOlder > 0) {
      const changePercent = Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
      
      if (changePercent > 25) {
        insights.push({
          icon: <TrendingUp className="h-4 w-4" />,
          title: `Activity up ${changePercent}% vs prior weeks`,
          description: "You're building strong momentum. This is the perfect time to tackle challenging goals.",
          type: "success",
        });
      } else if (changePercent < -25) {
        insights.push({
          icon: <TrendingDown className="h-4 w-4" />,
          title: `Activity down ${Math.abs(changePercent)}% recently`,
          description: "Consider setting smaller daily goals to rebuild your routine. Start with just one activity per day.",
          type: "warning",
        });
      }
    }
  }

  // 3. Consistency score and recommendation
  const last30Days = data.heatmapData.slice(-30);
  const activeDaysRecent = last30Days.filter(d => d.count > 0).length;
  const consistencyPercent = Math.round((activeDaysRecent / 30) * 100);

  if (consistencyPercent >= 70) {
    insights.push({
      icon: <Target className="h-4 w-4" />,
      title: `${consistencyPercent}% consistency this month`,
      description: "Excellent discipline! You're logging activities most days. Keep this routine going.",
      type: "success",
    });
  } else if (consistencyPercent >= 40) {
    insights.push({
      icon: <Target className="h-4 w-4" />,
      title: `${consistencyPercent}% consistency this month`,
      description: `Aim for ${consistencyPercent + 10}% next month. Try logging at the same time each day to build a habit.`,
      type: "info",
    });
  } else if (last30Days.length > 0) {
    insights.push({
      icon: <Clock className="h-4 w-4" />,
      title: "Opportunity for growth",
      description: "Set a reminder to log one activity each day. Small consistent actions compound over time.",
      type: "tip",
    });
  }

  // 4. Project balance recommendation
  if (data.projectDistribution.length >= 2) {
    const total = data.projectDistribution.reduce((sum, p) => sum + p.count, 0);
    const topProject = data.projectDistribution.reduce((a, b) => a.count > b.count ? a : b);
    const topPercent = Math.round((topProject.count / total) * 100);

    if (topPercent >= 70) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        title: `${topPercent}% focused on "${topProject.name}"`,
        description: `High focus can be good, but consider if other projects need attention to avoid bottlenecks.`,
        type: "info",
      });
    }
  }

  // 5. Streak pattern insight
  if (data.currentStreak >= 3 && data.longestStreak > data.currentStreak) {
    const daysToRecord = data.longestStreak - data.currentStreak;
    insights.push({
      icon: <Target className="h-4 w-4" />,
      title: `${daysToRecord} days to beat your record`,
      description: `Your longest streak was ${data.longestStreak} days. You're ${Math.round((data.currentStreak / data.longestStreak) * 100)}% of the way there!`,
      type: "tip",
    });
  }

  // 6. Weekend vs weekday analysis
  let weekdayTotal = 0, weekendTotal = 0, weekdayDays = 0, weekendDays = 0;
  data.heatmapData.forEach(d => {
    const date = new Date(d.date + "T12:00:00");
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) {
      weekendTotal += d.count;
      weekendDays++;
    } else {
      weekdayTotal += d.count;
      weekdayDays++;
    }
  });

  if (weekdayDays > 0 && weekendDays > 0) {
    const weekdayAvg = weekdayTotal / weekdayDays;
    const weekendAvg = weekendTotal / weekendDays;
    
    if (weekendAvg > weekdayAvg * 1.5) {
      insights.push({
        icon: <Calendar className="h-4 w-4" />,
        title: "Weekend warrior pattern",
        description: "You're more active on weekends. If possible, protect some weekend time for productivity.",
        type: "info",
      });
    } else if (weekdayAvg > weekendAvg * 2 && weekendAvg < 1) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        title: "Weekends are quiet",
        description: "Consider a light weekend routine - even 10 minutes of progress keeps momentum alive.",
        type: "tip",
      });
    }
  }

  return insights.slice(0, 4); // Limit to 4 most relevant insights
}
