import { describe, expect, it } from 'vitest';
import { dateUtils } from './utils';

describe('date utilities', () => {
  it('keeps date-only values on their calendar day when formatting', () => {
    expect(dateUtils.format('2026-08-09')).toBe('Aug 9, 2026');
  });
});
