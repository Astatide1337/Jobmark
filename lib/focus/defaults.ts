import { nanoid } from 'nanoid';
import type { FocusBlock, BreathingPatternDef, BreathingPattern } from './types';

export const BREATHING_PATTERNS: Record<BreathingPattern, BreathingPatternDef> = {
  box: {
    label: 'Box Breathing',
    description: 'Navy SEAL technique for focus and stress regulation.',
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'HOLD', duration: 4 },
      { label: 'EXHALE', duration: 4 },
      { label: 'HOLD', duration: 4 },
    ],
  },
  '4-7-8': {
    label: '4-7-8 Breathing',
    description: "Dr. Andrew Weil's technique for deep relaxation.",
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'HOLD', duration: 7 },
      { label: 'EXHALE', duration: 8 },
    ],
  },
  'physiological-sigh': {
    label: 'Physiological Sigh',
    description: "Dr. Andrew Huberman's method for rapid stress relief.",
    steps: [
      { label: 'INHALE', duration: 4 },
      { label: 'INHALE2', duration: 2 },
      { label: 'EXHALE', duration: 8 },
    ],
  },
  resonance: {
    label: 'Resonance Breathing',
    description: 'Coherent breathing to optimize heart rate variability.',
    steps: [
      { label: 'INHALE', duration: 5.5 },
      { label: 'EXHALE', duration: 5.5 },
    ],
  },
};

export const DEFAULT_RELEASE_TEXTS = [
  "Bring to mind any tension you're carrying from today.",
  'Acknowledge it. You worked hard.',
  'Now, let it drop from your shoulders.',
  'Leave the work here. You can return to it later.',
];

export const DEFAULT_AFFIRMATIONS = [
  'I am becoming the person I need to be to achieve my goals.',
  'Every challenge is an opportunity for growth.',
  'I have the skills and the discipline to succeed.',
  'My work is meaningful and makes a difference.',
  'I am focused, calm, and in control.',
];

export const BLOCK_LABELS: Record<string, string> = {
  affirmation: 'Affirmation Block',
  breathing: 'Breathing Exercise',
  goal: 'Goal Visualization',
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
