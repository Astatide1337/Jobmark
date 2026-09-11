import { calendarDateToUtcMidnight, shiftCalendarDate } from '@/lib/date-semantics';

export interface HeatmapDataPoint {
  date: string;
  count: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
}

export interface MonthLabel {
  month: string;
  weekIndex: number;
}

/**
 * Keep the all-time view useful when the record is new. It shows at least
 * one year, but expands farther back when the user has older activity.
 */
export function getHeatmapStartDate(firstActivityDate: string | undefined, today: string): string {
  const minimumStartDate = shiftCalendarDate(today, -364);

  if (firstActivityDate && firstActivityDate < minimumStartDate) {
    return firstActivityDate;
  }

  return minimumStartDate;
}

/**
 * Build the calendar used by both the server-rendered Insights page and its
 * range filter. Keeping one implementation prevents the two views from
 * drifting at month and week boundaries.
 */
export function buildHeatmapGrid(
  data: HeatmapDataPoint[],
  startDate: string,
  endDate: string
): { heatmapGrid: HeatmapDay[][]; monthLabels: MonthLabel[] } {
  const counts = new Map(data.map(day => [day.date, day.count]));
  const days: HeatmapDay[] = [];

  for (let date = startDate; date <= endDate; date = shiftCalendarDate(date, 1)) {
    days.push({
      date,
      count: counts.get(date) ?? 0,
      dayOfWeek: calendarDateToUtcMidnight(date).getUTCDay(),
    });
  }

  const heatmapGrid: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;

  for (let dayOfWeek = 0; dayOfWeek < firstDayOfWeek; dayOfWeek++) {
    currentWeek.push({ date: '', count: -1, dayOfWeek });
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      heatmapGrid.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: -1, dayOfWeek: currentWeek.length });
    }
    heatmapGrid.push(currentWeek);
  }

  const monthLabels: MonthLabel[] = [];
  let lastMonth = '';

  heatmapGrid.forEach((week, weekIndex) => {
    const firstDay = week.find(day => day.date);
    if (!firstDay) return;

    const monthKey = firstDay.date.slice(0, 7);
    if (monthKey === lastMonth) return;

    monthLabels.push({
      month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
        calendarDateToUtcMidnight(firstDay.date)
      ),
      weekIndex,
    });
    lastMonth = monthKey;
  });

  return { heatmapGrid, monthLabels };
}
