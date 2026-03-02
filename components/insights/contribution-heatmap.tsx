/**
 * Contribution Heatmap (GitHub Style)
 *
 * Why: Provides a "proof of work" visual that encourages daily logging.
 * It transforms 365 days of activity into a familiar density grid.
 *
 * Performance Strategy:
 * - Calculation Offloading: The grid calculation (weeks/days/labels) has
 *   been moved to the **Server Action** (`insights.ts`). This component
 *   is now a "Dumb Component" that purely handles high-contrast rendering.
 * - Fluid Grid: Uses a combination of `flex-1` and `aspect-square` to ensure
 *   the heatmap looks great on everything from mobile to wide desktops.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HeatmapDay, MonthLabel } from '@/app/actions/insights';

interface ContributionHeatmapProps {
  weeks: HeatmapDay[][];
  monthLabels: MonthLabel[];
}

// Consistent card styling
const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/60 shadow-sm';

export function ContributionHeatmap({ weeks, monthLabels }: ContributionHeatmapProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Color scale - HIGH CONTRAST
  const getColorClass = (count: number): string => {
    if (count === 0) return 'bg-foreground/[0.08]';
    if (count <= 2) return 'bg-primary/40';
    if (count <= 4) return 'bg-primary/60';
    if (count <= 6) return 'bg-primary/80';
    return 'bg-primary';
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-semibold">Contribution Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <TooltipProvider delayDuration={50}>
          {/* Full width container */}
          <div className="w-full">
            {/* Month labels row */}
            <div className="mb-3 flex pl-10">
              {weeks.map((_, weekIndex) => {
                const label = monthLabels.find(l => l.weekIndex === weekIndex);
                return (
                  <div
                    key={weekIndex}
                    className="text-foreground/70 min-w-0 flex-1 text-sm font-medium"
                  >
                    {label?.month || ''}
                  </div>
                );
              })}
            </div>

            {/* Grid - full width */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="text-foreground/60 flex w-10 shrink-0 flex-col justify-between pr-2 text-sm font-medium">
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span className="pb-10">Fri</span>
                <span></span>
              </div>

              {/* Heatmap cells - each column expands to fill */}
              <div className="flex flex-1 gap-1.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-1 flex-col gap-1.5">
                    {week.map((day, dayIndex) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'aspect-square rounded transition-all',
                              day.count === -1 ? 'bg-transparent' : getColorClass(day.count),
                              day.date === todayStr &&
                                'ring-primary ring-offset-background ring-2 ring-offset-1',
                              day.count >= 0 &&
                                'hover:ring-foreground/30 cursor-pointer hover:scale-110 hover:ring-1'
                            )}
                          />
                        </TooltipTrigger>
                        {day.count >= 0 && (
                          <TooltipContent side="top">
                            <p className="font-semibold">
                              {day.count === 0
                                ? 'No activities'
                                : `${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                            </p>
                            <p className="text-muted-foreground text-xs">{formatDate(day.date)}</p>
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
          <div className="text-foreground/70 mt-5 flex items-center justify-end gap-2 text-sm font-medium">
            <span>Less</span>
            <div className="bg-foreground/[0.08] h-4 w-4 rounded" />
            <div className="bg-primary/40 h-4 w-4 rounded" />
            <div className="bg-primary/60 h-4 w-4 rounded" />
            <div className="bg-primary/80 h-4 w-4 rounded" />
            <div className="bg-primary h-4 w-4 rounded" />
            <span>More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
