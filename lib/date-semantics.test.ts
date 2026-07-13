import { describe, expect, it } from 'vitest';
import {
  getCalendarDate,
  getCalendarRange,
  shiftCalendarDate,
  zonedCalendarDateToUtc,
} from './date-semantics';

describe('calendar date semantics', () => {
  it('builds an inclusive seven-day range with a half-open end', () => {
    const range = getCalendarRange({
      kind: '7d',
      now: new Date('2026-07-12T16:00:00.000Z'),
      timeZone: 'America/New_York',
    });

    expect(range.startDate).toBe('2026-07-06');
    expect(range.endDate).toBe('2026-07-12');
    expect(range.endExclusive.toISOString()).toBe('2026-07-13T00:00:00.000Z');
    expect((range.endExclusive.getTime() - range.start.getTime()) / 86_400_000).toBe(7);
  });

  it('handles month and year boundaries without mutating the input date', () => {
    const now = new Date('2025-01-01T04:00:00.000Z');
    const range = getCalendarRange({ kind: 'month', now, timeZone: 'America/New_York' });

    expect(range.startDate).toBe('2024-12-01');
    expect(range.endDate).toBe('2024-12-31');
    expect(now.toISOString()).toBe('2025-01-01T04:00:00.000Z');
  });

  it('keeps custom calendar date strings unchanged and rejects reversed ranges', () => {
    const start = '2026-03-08';
    const end = '2026-03-09';
    const range = getCalendarRange({
      kind: 'custom',
      customStartDate: start,
      customEndDate: end,
      timeZone: 'America/New_York',
    });

    expect(range.startDate).toBe('2026-03-08');
    expect(range.endDate).toBe('2026-03-09');
    expect(start).toBe('2026-03-08');
    expect(end).toBe('2026-03-09');
    expect(() =>
      getCalendarRange({
        kind: 'custom',
        customStartDate: end,
        customEndDate: start,
        timeZone: 'America/New_York',
      })
    ).toThrow('must not be after');
  });

  it('uses the user timezone across a daylight-saving transition', () => {
    expect(getCalendarDate(new Date('2026-03-08T04:30:00.000Z'), 'America/New_York')).toBe(
      '2026-03-07'
    );
    expect(getCalendarDate(new Date('2026-03-08T05:30:00.000Z'), 'America/New_York')).toBe(
      '2026-03-08'
    );
    expect(shiftCalendarDate('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('converts timestamp boundaries using the user timezone and DST offset', () => {
    expect(zonedCalendarDateToUtc('2026-03-08', 'America/New_York').toISOString()).toBe(
      '2026-03-08T05:00:00.000Z'
    );
    expect(zonedCalendarDateToUtc('2026-03-09', 'America/New_York').toISOString()).toBe(
      '2026-03-09T04:00:00.000Z'
    );
    expect(zonedCalendarDateToUtc('2026-03-08', 'Asia/Tokyo').toISOString()).toBe(
      '2026-03-07T15:00:00.000Z'
    );
  });

  it('covers exactly thirty calendar dates across a leap day', () => {
    const range = getCalendarRange({
      kind: '30d',
      now: new Date('2024-03-01T12:00:00.000Z'),
      timeZone: 'UTC',
    });

    expect(range.startDate).toBe('2024-02-01');
    expect(range.endDate).toBe('2024-03-01');
    expect(shiftCalendarDate(range.startDate, 29)).toBe(range.endDate);
    expect(range.endExclusive.toISOString()).toBe('2024-03-02T00:00:00.000Z');
  });

  it('handles leap-day month boundaries and year transitions', () => {
    const leapMonth = getCalendarRange({
      kind: 'month',
      now: new Date('2024-02-15T12:00:00.000Z'),
      timeZone: 'UTC',
    });
    expect(leapMonth.startDate).toBe('2024-02-01');
    expect(leapMonth.endDate).toBe('2024-02-15');
    expect(shiftCalendarDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftCalendarDate('2024-12-31', 1)).toBe('2025-01-01');
  });

  it('rejects invalid timezones and impossible calendar dates', () => {
    expect(() => getCalendarRange({ kind: '7d', timeZone: 'Not/AZone' })).toThrow(
      'Invalid timezone'
    );
    expect(() => shiftCalendarDate('2025-02-29', 1)).toThrow('Invalid calendar date');
  });
});
