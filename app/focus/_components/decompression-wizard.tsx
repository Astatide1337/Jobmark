'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useUI } from '@/components/providers/ui-provider';
import { cn } from '@/lib/utils';
import type { ResolvedFocusBlock } from '@/lib/focus/types';
import { AffirmationPhase } from './phases/affirmation';
import { BreathingPhase } from './phases/breathing';
import { GoalPhase } from './phases/goal';
import { CompletionPhase } from './phases/completion';

interface DecompressionWizardProps {
  blocks: ResolvedFocusBlock[];
}

export default function DecompressionWizard({ blocks }: DecompressionWizardProps) {
  const { uiV2 } = useUI();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio setup
  useEffect(() => {
    const audio = new Audio('/audio/weightless.mp3');
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    // Fade in
    audio.play().catch(e => console.log('Audio play failed:', e));
    let vol = 0;
    fadeIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        vol = Math.min(vol + 0.01, 0.2);
        audioRef.current.volume = vol;
        if (vol >= 0.2 && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
      }
    }, 200);

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fade out audio on completion
  function handleCompletion() {
    setIsComplete(true);
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    let vol = audioRef.current?.volume ?? 0.2;
    fadeIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        vol = Math.max(vol - 0.01, 0);
        audioRef.current.volume = vol;
        if (vol <= 0 && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          audioRef.current?.pause();
        }
      }
    }, 200);
  }

  function advance() {
    if (currentIndex < blocks.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      handleCompletion();
    }
  }

  const block = blocks[currentIndex];

  function renderBlock(b: ResolvedFocusBlock) {
    switch (b.type) {
      case 'affirmation': {
        return (
          <AffirmationPhase
            key={b.id}
            texts={b.config.resolvedTexts}
            totalDuration={b.config.totalDuration}
            onComplete={advance}
          />
        );
      }
      case 'breathing':
        return (
          <BreathingPhase
            key={b.id}
            pattern={b.config.pattern}
            cycles={b.config.cycles}
            onComplete={advance}
          />
        );
      case 'goal': {
        return (
          <GoalPhase
            key={b.id}
            goalText={b.config.resolvedGoalText}
            duration={b.config.duration}
            onComplete={advance}
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        'relative flex min-h-[60vh] w-full flex-col items-center justify-center px-6 text-center',
        uiV2 ? 'overflow-visible' : 'h-screen overflow-hidden'
      )}
    >
      {/* Exit link */}
      <Link
        href="/dashboard"
        className="text-foreground/40 hover:text-foreground fixed top-8 left-8 flex items-center gap-2 transition-colors duration-300"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm tracking-widest uppercase">Exit</span>
      </Link>

      <AnimatePresence mode="wait">
        {!isComplete ? (
          <motion.div
            key={currentIndex}
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {renderBlock(block)}
          </motion.div>
        ) : (
          <CompletionPhase key="completion" />
        )}
      </AnimatePresence>
    </div>
  );
}
