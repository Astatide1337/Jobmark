/**
 * Focus Subsystem Type Definitions
 *
 * Why: Defines the "Domain Model" for the decompression ritual. It supports
 * a polymorphic `FocusBlock` structure that allows the wizard to render
 * disparate activities (Breathing, Goals, Affirmations) through a unified
 * sequence interface.
 */
export type BreathingPattern = 'box' | '4-7-8' | 'physiological-sigh' | 'resonance';
export type FocusBlockType = 'affirmation' | 'breathing' | 'goal';

export interface AffirmationBlock {
  id: string;
  type: 'affirmation';
  config: {
    texts: string[];
    totalDuration: number; // total seconds for the block
  };
}

export interface BreathingBlock {
  id: string;
  type: 'breathing';
  config: {
    pattern: BreathingPattern;
    cycles: number; // default 3
  };
}

export interface GoalBlock {
  id: string;
  type: 'goal';
  config: {
    goalId?: string; // undefined = auto-resolve primary goal
    duration: number; // seconds, default 10
  };
}

export type FocusBlock = AffirmationBlock | BreathingBlock | GoalBlock;

// Breathing step definition used by the BreathingPhase component
export interface BreathingStep {
  label: string;
  duration: number; // seconds
}

export interface BreathingPatternDef {
  label: string;
  description: string;
  steps: BreathingStep[];
}

// What the wizard gets after server resolves goals & AI affirmations
export interface ResolvedAffirmationBlock extends AffirmationBlock {
  config: AffirmationBlock['config'] & {
    resolvedTexts: string[];
  };
}

export interface ResolvedGoalBlock extends GoalBlock {
  config: GoalBlock['config'] & {
    resolvedGoalText: string;
  };
}

export type ResolvedFocusBlock = ResolvedAffirmationBlock | BreathingBlock | ResolvedGoalBlock;
