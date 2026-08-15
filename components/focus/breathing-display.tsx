'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { BreathingPattern, BreathingStep } from '@/lib/focus/types';
import { BREATHING_PATTERNS } from '@/lib/focus/defaults';
import { cn } from '@/lib/utils';

type BreathingDisplaySize = 'full' | 'settings' | 'compact';

interface BreathingDisplayProps {
  pattern: BreathingPattern;
  stepIndex: number;
  cycleIndex: number;
  totalCycles: number;
  size?: BreathingDisplaySize;
  visible?: boolean;
}

export function BreathingDisplay({
  pattern,
  stepIndex,
  cycleIndex,
  totalCycles,
  size = 'full',
  visible = true,
}: BreathingDisplayProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const steps = patternDef.steps;
  const currentStep: BreathingStep = steps[stepIndex];

  // Scale the label itself instead of changing layout dimensions. The stage
  // stays fixed so switching between INHALE, HOLD, and EXHALE never jitters.
  const label = currentStep.label;
  const isInhale = label.startsWith('INHALE');
  const isExhale = label === 'EXHALE';
  const isHold = label === 'HOLD';

  let initialScale = 1.0;
  let targetScale = 1.0;
  const isFullSize = size === 'full';
  const maximumScale = isFullSize ? 1.5 : 1.26;
  const physiologicalInhaleScale = isFullSize ? 1.3 : 1.18;

  if (isInhale) {
    if (label === 'INHALE') {
      initialScale = 0.8;
      targetScale = pattern === 'physiological-sigh' ? physiologicalInhaleScale : maximumScale;
    } else {
      // INHALE2 (Physiological Sigh) continues from the first inhale.
      initialScale = isFullSize ? 1.3 : maximumScale;
      targetScale = maximumScale;
    }
  } else if (isHold) {
    if (stepIndex === 1) {
      // Hold after inhale (4-7-8 or Box)
      initialScale = maximumScale;
      targetScale = maximumScale;
    } else {
      // Hold after exhale (Box)
      initialScale = 0.8;
      targetScale = 0.8;
    }
  } else if (isExhale) {
    initialScale = maximumScale;
    targetScale = isFullSize ? 0.8 : 0.82;
  }

  const sizeClasses = {
    full: {
      root: 'h-[220px]',
      stage: 'h-40 max-w-[36rem] overflow-visible',
      label: 'text-[clamp(3.5rem,7vw,5rem)]',
    },
    settings: {
      root: 'h-[144px]',
      stage: 'h-24 max-w-[18rem] overflow-hidden',
      label: 'text-[clamp(2rem,4.5vw,2.75rem)]',
    },
    compact: {
      root: 'h-[168px]',
      stage: 'h-24 max-w-[20rem] overflow-hidden',
      label: 'text-[clamp(2.25rem,4vw,3rem)]',
    },
  }[size];

  return (
    <div
      className={cn(
        'flex w-full shrink-0 flex-col items-center justify-between text-center',
        sizeClasses.root
      )}
    >
      <div
        className={cn(
          'relative flex w-full min-w-0 shrink-0 items-center justify-center',
          sizeClasses.stage
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {visible && (
              <motion.span
                key={`${cycleIndex}-${stepIndex}`}
                className={cn(
                  'text-primary inline-block font-serif tracking-[0.12em] whitespace-nowrap will-change-[transform,opacity,filter]',
                  sizeClasses.label
                )}
                initial={{ opacity: 0, scale: initialScale, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: targetScale, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{
                  opacity: { duration: 0.4 },
                  filter: { duration: 0.4 },
                  scale: { duration: currentStep.duration, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: 'center center' }}
              >
                {label.replace(/[0-9]/g, '').trim()}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cycle indicator dots */}
      <div className="flex gap-2">
        {Array.from({ length: totalCycles }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${getCycleClass(i, cycleIndex)}`}
          />
        ))}
      </div>
    </div>
  );
}

function getCycleClass(index: number, currentIndex: number): string {
  if (index < currentIndex) return 'bg-primary';
  if (index === currentIndex) return 'bg-primary/60';
  return 'bg-foreground/20';
}
