/**
 * Editorial landing hero.
 *
 * First paint remains fully visible, while scroll and ambient transforms add
 * depth after hydration. No animation is allowed to gate the headline or demo.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthModal } from '@/components/auth';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { DashboardPreview } from './dashboard-preview';
import { useMotionPreference } from './use-motion-preference';

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
      setOutgoingWordIndex(previousIndex);
      setIsCrossfading(false);
      wordIndexRef.current = nextIndex;
      setWordIndex(nextIndex);

      firstFrameRef.current = window.requestAnimationFrame(() => {
        secondFrameRef.current = window.requestAnimationFrame(() => setIsCrossfading(true));
      });

      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(() => {
        setOutgoingWordIndex(null);
        setIsCrossfading(false);
      }, 260);
    };

    const interval = window.setInterval(advanceWord, 3500);
    return () => {
      window.clearInterval(interval);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      if (firstFrameRef.current !== null) window.cancelAnimationFrame(firstFrameRef.current);
      if (secondFrameRef.current !== null) window.cancelAnimationFrame(secondFrameRef.current);
    };
  }, []);

  return (
    <span aria-live="polite" className="relative inline-block w-[8ch]">
      {outgoingWordIndex !== null && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-200 ${isCrossfading ? 'opacity-0' : 'opacity-100'}`}
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
  const containerRef = useRef<HTMLElement>(null);
  const { openAuthModal } = useAuthModal();
  const prefersReducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const textY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 90]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 135]);
  const previewScale = useTransform(scrollYProgress, [0, 0.45], [1.035, 1]);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center overflow-hidden py-24 lg:py-20"
    >
      <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-b via-transparent to-transparent" />
      <motion.div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute top-[18%] right-[2%] h-[28rem] w-[34rem] rounded-full blur-3xl"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, -35, 25, 0], y: [0, 24, -18, 0], scale: [1, 1.08, 0.96, 1] }
        }
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col gap-16 xl:flex-row xl:items-center xl:justify-between xl:gap-24 2xl:gap-32">
          <motion.div style={{ y: textY }} className="relative z-10 w-full space-y-8 xl:max-w-xl">
            <motion.div
              initial={false}
              animate={{ y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">
                Save your work
              </span>
            </motion.div>

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
              <MagneticButton as="div" strength={0.12}>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="group bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none"
                >
                  Add a note
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </MagneticButton>
              <Link
                href="#product-tour"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 px-6 py-4 text-base transition-colors"
              >
                See how it works
              </Link>
            </div>

            <p className="text-muted-foreground/60 text-sm">Free to start. Your notes are yours.</p>
          </motion.div>

          <motion.div
            style={{ y: previewY }}
            className="w-full min-w-0 xl:max-w-[1000px] xl:flex-1"
          >
            <motion.div
              style={prefersReducedMotion ? undefined : { scale: previewScale }}
              initial={false}
              animate={{ y: 0 }}
              transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative"
            >
              <motion.div
                aria-hidden="true"
                className="from-primary/30 via-primary/10 pointer-events-none absolute -inset-4 rounded-[2rem] bg-linear-to-br to-transparent blur-2xl"
                animate={prefersReducedMotion ? undefined : { opacity: [0.45, 0.72, 0.45] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="border-primary/20 group-hover:border-primary/40 relative rounded-[1.15rem] border shadow-2xl shadow-black/25 transition-[border-color,box-shadow] duration-500 group-hover:shadow-black/35">
                <DashboardPreview />
                <motion.div
                  aria-hidden="true"
                  className="via-primary/70 pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent to-transparent"
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { x: ['-45%', '45%', '-45%'], opacity: [0.25, 0.7, 0.25] }
                  }
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
