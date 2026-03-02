'use client';

import { useEffect, useState } from 'react';
import type { BreathingPattern } from '@/lib/focus/types';
import { BREATHING_PATTERNS } from '@/lib/focus/defaults';
import { BreathingDisplay } from '@/components/focus/breathing-display';

interface BreathingPhaseProps {
  pattern: BreathingPattern;
  cycles: number;
  onComplete: () => void;
}

export function BreathingPhase({ pattern, cycles, onComplete }: BreathingPhaseProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const steps = patternDef.steps;

  const [cycleIndex, setCycleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    setVisible(true);
    const fadeOut = setTimeout(() => setVisible(false), (currentStep.duration - 0.8) * 1000);

    const advance = setTimeout(() => {
      const nextStep = stepIndex + 1;
      if (nextStep < steps.length) {
        setStepIndex(nextStep);
      } else {
        // End of cycle
        const nextCycle = cycleIndex + 1;
        if (nextCycle < cycles) {
          setCycleIndex(nextCycle);
          setStepIndex(0);
        } else {
          onComplete();
        }
      }
    }, currentStep.duration * 1000);

    return () => {
      clearTimeout(fadeOut);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, cycleIndex]);

  return (
    <BreathingDisplay
      pattern={pattern}
      stepIndex={stepIndex}
      cycleIndex={cycleIndex}
      totalCycles={cycles}
      visible={visible}
    />
  );
}
