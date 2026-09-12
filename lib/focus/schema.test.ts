import { describe, expect, it } from 'vitest';
import { focusConfigSchema } from './schema';

describe('canonical focus configuration schema', () => {
  it('accepts and round-trips the browser block format', () => {
    const config = [
      { id: 'breathing-1', type: 'breathing', config: { pattern: '4-7-8', cycles: 3 } },
      {
        id: 'affirmation-1',
        type: 'affirmation',
        config: { texts: ['I can do hard things.'], totalDuration: 60 },
      },
      { id: 'goal-1', type: 'goal', config: { goalId: 'goal-7', duration: 15 } },
    ];

    expect(focusConfigSchema.parse(config)).toEqual(config);
  });

  it('rejects legacy Pomodoro objects and unknown fields', () => {
    expect(focusConfigSchema.safeParse({ workDuration: 25, breakDuration: 5 }).success).toBe(false);
    expect(
      focusConfigSchema.safeParse([
        {
          id: 'breathing-1',
          type: 'breathing',
          config: { pattern: 'box', cycles: 3 },
          unexpected: true,
        },
      ]).success
    ).toBe(false);
  });
});
