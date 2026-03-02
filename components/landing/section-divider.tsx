/**
 * Animated Section Divider
 *
 * Why: Provides a high-quality visual separation between landing
 * page sections. Instead of a hard line, it "draws" itself into view
 * using `useInView`.
 *
 * Design: Features an optional "Glow" effect to emphasize the
 * "Physical UI" aesthetic.
 */
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionDividerProps {
  className?: string;
  maxWidth?: string;
  delay?: number;
  glow?: boolean;
}

export function SectionDivider({
  className,
  maxWidth = 'max-w-4xl',
  delay = 0,
  glow = false,
}: SectionDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full items-center justify-center px-6 py-8 md:py-12',
        className
      )}
    >
      {/* Optional glow effect */}
      {glow && (
        <motion.div
          className={cn('absolute h-px', maxWidth, 'w-full')}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: delay + 0.4 }}
        >
          <div className="bg-primary/20 absolute inset-0 blur-md" />
        </motion.div>
      )}

      {/* Left line - draws from left edge toward center */}
      <motion.div
        className={cn(
          'to-border/40 h-px flex-1 bg-gradient-to-r from-transparent',
          maxWidth ? `${maxWidth.replace('max-w-', 'max-w-[')}` : ''
        )}
        style={{ maxWidth: '50%' }}
        initial={{ scaleX: 0, opacity: 0, originX: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      />

      {/* Right line - draws from right edge toward center */}
      <motion.div
        className="to-border/40 h-px flex-1 bg-gradient-to-l from-transparent"
        style={{ maxWidth: '50%' }}
        initial={{ scaleX: 0, opacity: 0, originX: 1 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      />
    </div>
  );
}
