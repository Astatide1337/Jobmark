'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const motionEnabled = prefersReducedMotion !== true;

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={pathname}
        className="min-h-screen"
        initial={motionEnabled ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={motionEnabled ? { opacity: 0, y: -8 } : undefined}
        transition={motionEnabled ? { duration: 0.24, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
