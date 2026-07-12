import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRelativeDay, isDateOnlyOverdue } from './network';

describe('network date-only semantics', () => {
  afterEach(() => vi.useRealTimers());

  it('evaluates follow-up dates in the supplied user timezone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T03:30:00.000Z'));

    expect(getRelativeDay('2026-07-12', 'America/New_York')).toBe('tomorrow');
    expect(getRelativeDay('2026-07-12', 'Asia/Tokyo')).toBe('today');
    expect(isDateOnlyOverdue('2026-07-11', 'America/New_York')).toBe(false);
    expect(isDateOnlyOverdue('2026-07-11', 'Asia/Tokyo')).toBe(true);
  });
});
