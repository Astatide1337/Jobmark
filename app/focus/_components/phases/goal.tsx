'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GoalPhaseProps {
  goalText: string;
  duration: number;
  onComplete: () => void;
}

export function GoalPhase({ goalText, duration, onComplete }: GoalPhaseProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div className="flex flex-col items-center px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key="goal"
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        >
          <p className="text-foreground/70 font-serif text-xl leading-relaxed md:text-2xl">
            Picture yourself having already achieved:
          </p>
          <p className="text-foreground max-w-xl font-serif text-2xl leading-relaxed font-medium md:text-4xl">
            {goalText}
          </p>
          <p className="text-primary mt-2 font-serif text-lg italic md:text-xl">
            See yourself living that reality now.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
