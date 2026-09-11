'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * The headline animation used by the original Jobmark landing page.
 *
 * Why: Each phrase stays on its own line while the words and letters move as
 * one editorial unit. The timer is cleaned up so leaving the landing page
 * cannot leave a state update running in the background.
 */
export function FlipWords({
  words,
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) {
  const [currentWord, setCurrentWord] = useState(words[0] ?? '');
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = useCallback(() => {
    const currentIndex = words.indexOf(currentWord);
    const nextWord = words[currentIndex + 1] ?? words[0] ?? '';
    setCurrentWord(nextWord);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (isAnimating || words.length < 2) return;

    const timer = window.setTimeout(startAnimation, duration);
    return () => window.clearTimeout(timer);
  }, [duration, isAnimating, startAnimation, words.length]);

  return (
    <AnimatePresence
      initial={false}
      onExitComplete={() => {
        setIsAnimating(false);
      }}
    >
      <motion.span
        key={currentWord}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 10 }}
        exit={{
          opacity: 0,
          y: -40,
          x: 40,
          filter: 'blur(8px)',
          scale: 2,
          position: 'absolute',
        }}
        className={cn('relative z-10 inline-block text-left', className)}
      >
        {currentWord.split(' ').map((word, wordIndex) => (
          <motion.span
            key={`${word}-${wordIndex}`}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: wordIndex * 0.3, duration: 0.3 }}
            className="inline-block whitespace-nowrap"
          >
            {word.split('').map((letter, letterIndex) => (
              <motion.span
                key={`${word}-${letterIndex}`}
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: wordIndex * 0.3 + letterIndex * 0.05,
                  duration: 0.2,
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
            <span className="inline-block">&nbsp;</span>
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
