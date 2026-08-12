/**
 * Calendar-date rules shared by reports and analytics.
 *
 * Activity.logDate is a date-only database value. All boundaries below are
 * represented as UTC midnights so PostgreSQL comparisons are independent of
 * the deployment server's local timezone. The displayed calendar date is
 * derived in the user's IANA timezone before these boundaries are built.
 */

export const DEFAULT_TIME_ZONE = 'America/New_York';

export type CalendarRange = {
  start: Date;
  endExclusive: Date;
  startDate: string;
  endDate: string;
  timeZone: string;
};

type DateParts = { year: number; month: number; day: number };

function datePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])
  );
  return { year: values.year, month: values.month, day: values.day };
}

function dateTimePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US-u-hc-h23', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function dateString(parts: DateParts): string {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

function parseDateString(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Invalid calendar date');
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day
  ) {
    throw new Error('Invalid calendar date');
  }
  return parts;
}

export function shiftCalendarDate(value: string, days: number): string {
  const parts = parseDateString(value);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return date.toISOString().slice(0, 10);
}

export function calendarDateToUtcMidnight(value: string): Date {
  const parts = parseDateString(value);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/**
 * Convert a user's local calendar midnight to the corresponding UTC instant.
 * This is for timestamp columns; date-only activity values should use
 * calendarDateToUtcMidnight instead.
 */
export function zonedCalendarDateToUtc(value: string, timeZone: string): Date {
  const date = parseDateString(value);
  if (!isValidTimeZone(timeZone)) throw new Error('Invalid timezone');

  let guess = Date.UTC(date.year, date.month - 1, date.day);
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = dateTimePartsInTimeZone(new Date(guess), timeZone);
    if (
      local.year === date.year &&
      local.month === date.month &&
      local.day === date.day &&
      local.hour === 0 &&
      local.minute === 0 &&
      local.second === 0
    ) {
      return new Date(guess);
    }
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );
    const offset = localAsUtc - guess;
    const corrected = guess - offset;
    guess = corrected;
  }
  return new Date(guess);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function isValidCalendarDate(value: string): boolean {
  try {
    parseDateString(value);
    return true;
  } catch {
    return false;
  }
}

export function getCalendarDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return dateString(datePartsInTimeZone(date, timeZone));
}

export function getCalendarRange(options: {
  kind: '7d' | '30d' | 'month' | 'custom';
  now?: Date;
  timeZone?: string;
  customStartDate?: string;
  customEndDate?: string;
}): CalendarRange {
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  if (!isValidTimeZone(timeZone)) throw new Error('Invalid timezone');

  const today = getCalendarDate(options.now ?? new Date(), timeZone);
  let startDate: string;
  let endDate: string;

  if (options.kind === 'custom') {
    if (!options.customStartDate || !options.customEndDate) {
      throw new Error('Custom report dates are required');
    }
    parseDateString(options.customStartDate);
    parseDateString(options.customEndDate);
    startDate = options.customStartDate;
    endDate = options.customEndDate;
  } else {
    let days = 0;
    if (options.kind === '7d') days = 6;
    else if (options.kind === '30d') days = 29;
    startDate =
      options.kind === 'month' ? `${today.slice(0, 7)}-01` : shiftCalendarDate(today, -days);
    endDate = today;
  }

  if (startDate > endDate) throw new Error('Report start date must not be after end date');
  return {
    start: calendarDateToUtcMidnight(startDate),
    endExclusive: calendarDateToUtcMidnight(shiftCalendarDate(endDate, 1)),
    startDate,
    endDate,
    timeZone,
  };
}
