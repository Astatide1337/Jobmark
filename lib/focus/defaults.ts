/**
 * Default Focus & Meditation Configurations
 *
 * Why: Provides a set of science-backed breathing patterns (Huberman, Weil)
 * and affirmations to ensure the Focus feature is immediately valuable for
 * new users.
 */
import { nanoid } from 'nanoid';
import type { FocusBlock, BreathingPatternDef, BreathingPattern } from './types';

export const BREATHING_PATTERNS: Record<BreathingPattern, BreathingPatternDef> = {
  box: {
    label: 'Box breathing',
    description: 'Breathe in four equal parts.',
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'HOLD', duration: 4 },
      { label: 'EXHALE', duration: 4 },
      { label: 'HOLD', duration: 4 },
    ],
  },
  '4-7-8': {
    label: '4-7-8 breathing',
    description: 'Breathe out for longer than you breathe in.',
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'HOLD', duration: 7 },
      { label: 'EXHALE', duration: 8 },
    ],
  },
  'physiological-sigh': {
    label: 'Two short breaths',
    description: 'Take two short breaths, then breathe out slowly.',
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'INHALE2', duration: 2 },
      { label: 'EXHALE', duration: 8 },
    ],
  },
  resonance: {
    label: 'Slow breathing',
    description: 'Breathe in and out at an even pace.',
    steps: [
      { label: 'INHALE', duration: 5.5 },
      { label: 'EXHALE', duration: 5.5 },
    ],
  },
};

export const DEFAULT_RELEASE_TEXTS = [
  'Notice what is still on your mind.',
  'You do not have to solve it now.',
  'Let your shoulders relax.',
  'You can come back to the work tomorrow.',
];

export const DEFAULT_AFFIRMATIONS = [
  'I can take the next step.',
  'Doing a little at a time is enough.',
  'The work I did today matters.',
  'I can be clear even when I do not know everything yet.',
  'I can stop for today and keep going tomorrow.',
];

export const BLOCK_LABELS: Record<string, string> = {
  affirmation: 'Short reminders',
  breathing: 'Breathing',
  goal: 'Think about your goal',
};

export function getDefaultFocusConfig(): FocusBlock[] {
  return [
    {
      id: nanoid(),
      type: 'affirmation',
      config: {
        texts: [...DEFAULT_RELEASE_TEXTS],
        totalDuration: 32,
      },
    },
    {
      id: nanoid(),
      type: 'breathing',
      config: {
        pattern: '4-7-8',
        cycles: 3,
      },
    },
    {
      id: nanoid(),
      type: 'affirmation',
      config: {
        texts: [...DEFAULT_AFFIRMATIONS],
        totalDuration: 60,
      },
    },
    {
      id: nanoid(),
      type: 'goal',
      config: {
        duration: 15,
      },
    },
  ];
}
