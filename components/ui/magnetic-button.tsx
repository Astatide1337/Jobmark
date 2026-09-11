'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionPreference } from '@/components/landing/use-motion-preference';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  as?: 'button' | 'div';
}

/**
 * Pointer-follow micro-interaction for a small number of high-value landing CTAs.
 * Motion values avoid a React render on every pointer move, and reduced-motion
 * users get an ordinary control with identical semantics.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.18,
  onClick,
  as = 'button',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const prefersReducedMotion = useMotionPreference();
  const xTarget = useMotionValue(0);
  const yTarget = useMotionValue(0);
  const x = useSpring(xTarget, { stiffness: 360, damping: 24, mass: 0.45 });
  const y = useSpring(yTarget, { stiffness: 360, damping: 24, mass: 0.45 });

  const handlePointerMove = (event: MouseEvent) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    xTarget.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    yTarget.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    xTarget.set(0);
    yTarget.set(0);
  };

  const Component = as === 'div' ? motion.div : motion.button;

  return (
    <Component
      ref={ref as never}
      className={cn('relative', className)}
      onMouseMove={handlePointerMove}
      onMouseLeave={reset}
      onBlur={reset}
      onClick={onClick}
      style={prefersReducedMotion ? undefined : { x, y }}
    >
      {children}
    </Component>
  );
}
