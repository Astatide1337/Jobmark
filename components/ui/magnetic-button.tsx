/**
 * Magnetic Button (Framer Motion)
 *
 * Why: Adds a "Playful & Premium" micro-interaction. The button
 * subtley follows the user's cursor within a certain radius, creating
 * a magnetic attraction effect.
 *
 * Physics: Uses a high-stiffness spring transition to ensure the
 * movement feels snappy and responsive without being sluggish.
 */
'use client';

import { useRef, useState, ReactNode, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  as?: 'button' | 'div';
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  onClick,
  as = 'button',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = (e.clientX - centerX) * strength;
    const distanceY = (e.clientY - centerY) * strength;

    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const Component = motion[as] as typeof motion.button;

  return (
    <Component
      ref={ref as React.RefObject<HTMLButtonElement>}
      className={cn('relative', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 15, mass: 0.5 }}
    >
      {children}
    </Component>
  );
}
