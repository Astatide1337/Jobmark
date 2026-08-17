/**
 * Accessible contribution calendar.
 *
 * Why: Month labels, weekday labels, and cells must share one coordinate
 * system. A CSS grid keeps them aligned at every date range and makes each
 * real day keyboard-focusable instead of relying on hover-only divs.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HeatmapDay, MonthLabel } from '@/app/actions/insights';

interface ContributionHeatmapProps {
  weeks: HeatmapDay[][];
  monthLabels: MonthLabel[];
  today: string;
}

const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/60 shadow-sm';

export function ContributionHeatmap({ weeks, monthLabels, today }: ContributionHeatmapProps) {
  const columns = `2.75rem repeat(${weeks.length}, minmax(1rem, 1.25rem))`;
  const rows = '1.25rem repeat(7, minmax(1rem, 1.25rem))';

  const getColorClass = (count: number): string => {
    if (count === 0) return 'bg-foreground/[0.08]';
    if (count <= 2) return 'bg-primary/40';
    if (count <= 4) return 'bg-primary/60';
    if (count <= 6) return 'bg-primary/80';
    return 'bg-primary';
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Note pattern</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={50}>
          <div className="w-full overflow-x-auto pb-1">
            <div
              className="grid min-w-max items-center gap-1.5"
              style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}
            >
              <span aria-hidden="true" style={{ gridColumn: 1, gridRow: 1 }} />
              {monthLabels.map(monthLabel => (
                <span
                  key={`month-${monthLabel.weekIndex}`}
                  className="text-foreground/70 h-5 text-center text-xs font-medium"
                  style={{ gridColumn: monthLabel.weekIndex + 2, gridRow: 1 }}
                >
                  {monthLabel.month}
                </span>
              ))}

              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, dayIndex) => (
                <span
                  key={`weekday-${dayIndex}`}
                  aria-hidden={label === ''}
                  className="text-foreground/60 pr-2 text-xs font-medium"
                  style={{ gridColumn: 1, gridRow: dayIndex + 2 }}
                >
                  {label}
                </span>
              ))}

              {weeks.flatMap((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const cellStyle = { gridColumn: weekIndex + 2, gridRow: dayIndex + 2 };

                  if (day.count < 0 || !day.date) {
                    return (
                      <span
                        key={`empty-${weekIndex}-${dayIndex}`}
                        aria-hidden="true"
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        style={cellStyle}
                      />
                    );
                  }

                  const label = `${formatDate(day.date)}: ${day.count} ${day.count === 1 ? 'note' : 'notes'}`;
                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={label}
                          title={label}
                          style={cellStyle}
                          className={cn(
                            'focus-visible:ring-ring/70 h-4 w-4 rounded-sm transition-[background-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:h-5 sm:w-5',
                            getColorClass(day.count),
                            day.date === today &&
                              'ring-primary ring-offset-background ring-2 ring-offset-1',
                            'hover:ring-foreground/30 hover:ring-1'
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-semibold">
                          {day.count === 0
                            ? 'No notes'
                            : `${day.count} ${day.count === 1 ? 'note' : 'notes'}`}
                        </p>
                        <p className="text-muted-foreground text-xs">{formatDate(day.date)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-foreground/70 mt-5 flex items-center justify-end gap-2 text-xs font-medium">
            <span>Less</span>
            <span aria-hidden="true" className="bg-foreground/[0.08] h-4 w-4 rounded-sm" />
            <span aria-hidden="true" className="bg-primary/40 h-4 w-4 rounded-sm" />
            <span aria-hidden="true" className="bg-primary/60 h-4 w-4 rounded-sm" />
            <span aria-hidden="true" className="bg-primary/80 h-4 w-4 rounded-sm" />
            <span aria-hidden="true" className="bg-primary h-4 w-4 rounded-sm" />
            <span>More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}
