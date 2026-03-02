'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { BreathingPattern, BreathingStep } from '@/lib/focus/types';
import { BREATHING_PATTERNS } from '@/lib/focus/defaults';

interface BreathingDisplayProps {
  pattern: BreathingPattern;
  stepIndex: number;
  cycleIndex: number;
  totalCycles: number;
  visible: boolean;
}

export function BreathingDisplay({
  pattern,
  stepIndex,
  cycleIndex,
  totalCycles,
  visible,
}: BreathingDisplayProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const steps = patternDef.steps;
  const currentStep: BreathingStep = steps[stepIndex];

  // Scale: expand on inhale, hold big, shrink on exhale
  const label = currentStep.label;
  const isInhale = label.startsWith('INHALE');
  const isExhale = label === 'EXHALE';
  const isHold = label === 'HOLD';

  let initialScale = 1.0;
  let targetScale = 1.0;

  if (isInhale) {
    if (label === 'INHALE') {
      initialScale = 0.8;
      targetScale = pattern === 'physiological-sigh' ? 1.3 : 1.5;
    } else {
      // INHALE2 (Physiological Sigh)
      initialScale = 1.3;
      targetScale = 1.5;
    }
  } else if (isHold) {
    if (stepIndex === 1) {
      // Hold after inhale (4-7-8 or Box)
      initialScale = 1.5;
      targetScale = 1.5;
    } else {
      // Hold after exhale (Box)
      initialScale = 0.8;
      targetScale = 0.8;
    }
  } else if (isExhale) {
    initialScale = 1.5;
    targetScale = 0.8;
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${cycleIndex}-${stepIndex}`}
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: initialScale, filter: 'blur(10px)' }}
          animate={{
            opacity: visible ? 1 : 0,
            scale: targetScale,
            filter: visible ? 'blur(0px)' : 'blur(10px)',
          }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{
            opacity: { duration: 0.4 },
            filter: { duration: 0.4 },
            scale: { duration: currentStep.duration, ease: 'easeInOut' },
          }}
        >
          <span className="text-primary font-serif text-5xl tracking-widest md:text-7xl">
            {label.replace(/[0-9]/g, '')}
          </span>
          <span className="text-foreground/50 text-sm tracking-widest">
            {currentStep.duration}s
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Cycle indicator dots */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: totalCycles }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
              i < cycleIndex
                ? 'bg-primary'
                : i === cycleIndex
                  ? 'bg-primary/60'
                  : 'bg-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
