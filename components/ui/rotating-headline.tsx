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

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Why: useSyncExternalStore gives the server and hydration pass the same
// visible first frame, then allows later headline changes to animate.
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

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
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );

  useEffect(() => {
    if (headlines.length < 2) return;

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
      <AnimatePresence initial={false} mode="sync">
        <motion.h1
          key={currentIndex}
          // The first headline is visible on the server and during hydration.
          // Later headlines cross-fade without leaving a blank frame.
          initial={isHydrated ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 top-0 font-serif text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-6xl lg:whitespace-nowrap"
        >
          <span className="text-foreground">{currentHeadline.text}</span>
          {currentHeadline.highlight && (
            <>
              <br />
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
  { text: 'Be ready for', highlight: 'reviews.' },
  { text: 'Keep your', highlight: 'notes together.' },
  { text: 'See your', highlight: 'progress.' },
];
