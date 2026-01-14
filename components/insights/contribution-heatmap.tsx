"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HeatmapDataPoint } from "@/app/actions/insights";

interface ContributionHeatmapProps {
  data: HeatmapDataPoint[];
}

// Consistent card styling
const CARD_STYLES = "rounded-2xl border border-border/40 bg-card/60 shadow-sm";

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.count));
    return map;
  }, [data]);

  const days = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0,
        dayOfWeek: date.getDay(),
      });
    }
    return result;
  }, [dataMap]);

  const weeks = useMemo(() => {
    const result: typeof days[] = [];
    let currentWeek: typeof days = [];
    
    const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: "", count: -1, dayOfWeek: i });
    }
    
    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }
    
    return result;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const validDays = week.filter((d) => d.date);
      if (validDays.length > 0) {
        const firstDay = new Date(validDays[0].date);
        const month = firstDay.getMonth();
        if (month !== lastMonth) {
          labels.push({
            month: firstDay.toLocaleDateString("en-US", { month: "short" }),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [weeks]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Color scale - HIGH CONTRAST
  const getColorClass = (count: number): string => {
    if (count === 0) return "bg-foreground/[0.08]";
    if (count <= 2) return "bg-primary/40";
    if (count <= 4) return "bg-primary/60";
    if (count <= 6) return "bg-primary/80";
    return "bg-primary";
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="pb-4 px-6 pt-6">
        <CardTitle className="text-base font-semibold">
          Contribution Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <TooltipProvider delayDuration={50}>
          {/* Full width container */}
          <div className="w-full">
            {/* Month labels row */}
            <div className="flex mb-3 pl-10">
              {weeks.map((_, weekIndex) => {
                const label = monthLabels.find((l) => l.weekIndex === weekIndex);
                return (
                  <div 
                    key={weekIndex} 
                    className="flex-1 text-sm font-medium text-foreground/70 min-w-0"
                  >
                    {label?.month || ""}
                  </div>
                );
              })}
            </div>

            {/* Grid - full width */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col justify-between text-sm font-medium text-foreground/60 w-10 pr-2 shrink-0">
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span className="pb-10">Fri</span>
                <span></span>
              </div>

              {/* Heatmap cells - each column expands to fill */}
              <div className="flex-1 flex gap-1.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex-1 flex flex-col gap-1.5">
                    {week.map((day, dayIndex) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "aspect-square rounded transition-all",
                              day.count === -1 
                                ? "bg-transparent" 
                                : getColorClass(day.count),
                              day.date === todayStr && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                              day.count >= 0 && "cursor-pointer hover:scale-110 hover:ring-1 hover:ring-foreground/30"
                            )}
                          />
                        </TooltipTrigger>
                        {day.count >= 0 && (
                          <TooltipContent side="top">
                            <p className="font-semibold">
                              {day.count === 0
                                ? "No activities"
                                : `${day.count} ${day.count === 1 ? "activity" : "activities"}`}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatDate(day.date)}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend - HIGH CONTRAST */}
          <div className="flex items-center justify-end gap-2 mt-5 text-sm font-medium text-foreground/70">
            <span>Less</span>
            <div className="w-4 h-4 rounded bg-foreground/[0.08]" />
            <div className="w-4 h-4 rounded bg-primary/40" />
            <div className="w-4 h-4 rounded bg-primary/60" />
            <div className="w-4 h-4 rounded bg-primary/80" />
            <div className="w-4 h-4 rounded bg-primary" />
            <span>More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { 
    weekday: "short",
    month: "short", 
    day: "numeric",
  });
}
