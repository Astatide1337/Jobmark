/**
 * Page Transition Wrapper
 *
 * Why: Standard route changes in SPAs can feel jarring. This component
 * provides a smooth fade-and-slide animation during navigation.
 *
 * Psychology: Reduces perceived latency and cognitive load by
 * providing a visual bridge between the "Old" and "New" pages.
 *
 * Accessibility: Automatically disables animations if the user has
 * enabled "Reduced Motion" in their OS settings.
 */
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -8,
    },
  };

  const pageTransition = {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.2,
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      {children}
    </motion.div>
  );
}
