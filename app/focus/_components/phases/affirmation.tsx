'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AffirmationPhaseProps {
  texts: string[];
  totalDuration: number;
  onComplete: () => void;
}

export function AffirmationPhase({ texts, totalDuration, onComplete }: AffirmationPhaseProps) {
  const [textIndex, setTextIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const durationPerText = totalDuration / texts.length;

  useEffect(() => {
    setVisible(true);
    const fadeOut = setTimeout(() => setVisible(false), (durationPerText - 1.5) * 1000);
    const advance = setTimeout(() => {
      if (textIndex < texts.length - 1) {
        setTextIndex(i => i + 1);
      } else {
        onComplete();
      }
    }, durationPerText * 1000);

    return () => {
      clearTimeout(fadeOut);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textIndex, texts.length, durationPerText]);

  return (
    <div className="flex flex-col items-center px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={textIndex}
          className="text-foreground max-w-xl font-serif text-2xl leading-relaxed italic md:text-4xl"
          initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.95 }}
          animate={{
            opacity: visible ? 1 : 0,
            filter: visible ? 'blur(0px)' : 'blur(12px)',
            scale: visible ? 1 : 0.95,
          }}
          exit={{ opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        >
          {texts[textIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      {texts.length > 1 && (
        <div className="mt-10 flex gap-1.5">
          {texts.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-700 ${
                i < textIndex
                  ? 'bg-primary w-4'
                  : i === textIndex
                    ? 'bg-primary/70 w-4'
                    : 'bg-foreground/20 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
