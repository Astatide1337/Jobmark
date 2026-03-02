'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { logDecompressionSession } from '@/app/actions/decompress';

interface CompletionPhaseProps {
  onMount?: () => void;
}

export function CompletionPhase({ onMount }: CompletionPhaseProps) {
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current) {
      logged.current = true;
      logDecompressionSession().catch(console.error);
      onMount?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center gap-8 text-center"
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      <div className="flex flex-col gap-3">
        <p className="text-foreground font-serif text-3xl md:text-4xl">
          You&apos;ve cultivated peace today.
        </p>
        <p className="text-primary font-serif text-xl italic">Well done.</p>
      </div>

      <Link
        href="/dashboard"
        className="text-foreground/60 hover:text-foreground mt-4 text-sm tracking-widest uppercase transition-colors duration-300"
      >
        Return to Dashboard
      </Link>
    </motion.div>
  );
}
