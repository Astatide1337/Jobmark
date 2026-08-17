/**
 * Editorial landing hero.
 *
 * Why: The first screen should be visible and predictable on first paint.
 * The only changing element is a complete-word crossfade with reserved
 * geometry; the rest of the section is ordinary document layout.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthModal } from '@/components/auth';
import { DashboardPreview } from './dashboard-preview';

const headlineWords = ['did.', 'fixed.', 'learned.', 'built.'];

function RotatingWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [outgoingWordIndex, setOutgoingWordIndex] = useState<number | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const wordIndexRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const advanceWord = () => {
      const previousIndex = wordIndexRef.current;
      const nextIndex = (previousIndex + 1) % headlineWords.length;

      // Keep the old word mounted while the new word enters. This preserves a
      // continuous paint; changing one node to opacity 0 creates a visible
      // blank flash between words.
      setOutgoingWordIndex(previousIndex);
      setIsCrossfading(false);
      wordIndexRef.current = nextIndex;
      setWordIndex(nextIndex);

      firstFrameRef.current = window.requestAnimationFrame(() => {
        secondFrameRef.current = window.requestAnimationFrame(() => {
          setIsCrossfading(true);
        });
      });

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setOutgoingWordIndex(null);
        setIsCrossfading(false);
      }, 260);
    };

    const interval = window.setInterval(() => {
      advanceWord();
    }, 3500);

    return () => {
      window.clearInterval(interval);
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (firstFrameRef.current !== null) window.cancelAnimationFrame(firstFrameRef.current);
      if (secondFrameRef.current !== null) window.cancelAnimationFrame(secondFrameRef.current);
    };
  }, []);

  return (
    <span aria-live="polite" className="relative inline-block w-[8ch]">
      {outgoingWordIndex !== null && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-200 ${
            isCrossfading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {headlineWords[outgoingWordIndex]}
        </span>
      )}
      <span
        className={`relative inline-block transition-opacity duration-200 ${
          outgoingWordIndex !== null && !isCrossfading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {headlineWords[wordIndex]}
      </span>
    </span>
  );
}

export function EditorialHero() {
  const { openAuthModal } = useAuthModal();

  return (
    <section className="relative flex min-h-screen items-center py-24 lg:py-20">
      <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-b via-transparent to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col gap-16 xl:flex-row xl:items-center xl:justify-between xl:gap-24 2xl:gap-32">
          <div className="relative z-10 w-full space-y-8 xl:max-w-xl">
            <div className="flex items-center gap-3">
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">
                Save your work
              </span>
            </div>

            <h1 className="font-serif text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-foreground block">Remember what you</span>
              <span className="text-primary block min-h-[1.1em]">
                <RotatingWord />
              </span>
            </h1>

            <p className="text-muted-foreground max-w-lg text-xl leading-relaxed">
              Jobmark gives you one place to write down what you did, fixed, and learned. Use those
              notes later for reviews and updates.
            </p>

            <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openAuthModal}
                className="group bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium transition-colors"
              >
                Add a note
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <Link
                href="#product-tour"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 px-6 py-4 text-base transition-colors"
              >
                See how it works
              </Link>
            </div>

            <p className="text-muted-foreground/60 text-sm">Free to start. Your notes are yours.</p>
          </div>

          <div className="w-full min-w-0 xl:max-w-[1000px] xl:flex-1">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
