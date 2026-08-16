/**
 * Dynamic Rotating Headline
 *
 * Why: Communicates the core value propositions of jobmark in a
 * compact, high-energy format.
 *
 * Implementation:
 * - Uses `AnimatePresence` for smooth cross-fading of text.
 * - Supports partial highlights (primary color) to emphasize keywords.
 * - Automatically cycles through an array of headlines on a timer.
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeadlinePart {
  text: string;
  highlight?: string;
}

interface RotatingHeadlineProps {
  headlines: HeadlinePart[];
  interval?: number;
  className?: string;
}

export function RotatingHeadline({
  headlines,
  interval = 3000,
  className = '',
}: RotatingHeadlineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % headlines.length);
    }, interval);

    return () => clearInterval(timer);
  }, [headlines.length, interval]);

  const currentHeadline = headlines[currentIndex];

  return (
    <div
      className={`relative h-[13rem] w-full overflow-visible sm:h-[12rem] lg:h-[13rem] ${className}`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.h1
          key={currentIndex}
          // Animate later word flips, but let the first headline render
          // immediately so the page does not flash on initial load.
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 top-0 font-serif text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          <span className="text-foreground">{currentHeadline.text}</span>
          {currentHeadline.highlight && (
            <>
              {' '}
              <span className="text-primary">{currentHeadline.highlight}</span>
            </>
          )}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}

// Pre-configured headlines for Jobmark
export const jobmarkHeadlines: HeadlinePart[] = [
  { text: 'Remember what you', highlight: 'did.' },
  { text: 'Be ready when', highlight: 'it matters.' },
  { text: 'Keep a record of', highlight: 'the work.' },
  { text: 'Make your progress', highlight: 'visible.' },
];
