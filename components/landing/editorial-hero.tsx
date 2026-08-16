/**
 * Editorial Hero Section
 *
 * Why: This is the high-impact visual "hook" of the landing page. It
 * uses advanced Motion physics to communicate a premium, technical brand.
 *
 * Motion Architecture:
 * - Parallax: Headlines and the dashboard move at different speeds during
 *   scroll to create depth.
 * - Interaction: The dashboard remains a normal 2D hit-test surface so its
 *   embedded controls work reliably with a mouse, keyboard, or touch input.
 */
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DemoDashboard } from './demos/demo-dashboard';
import { RotatingHeadline } from '@/components/ui/rotating-headline';
import { useAuthModal } from '@/components/auth';

const jobmarkHeadlines = [
  { text: 'Remember what you', highlight: 'did.' },
  { text: 'Be ready for', highlight: 'reviews.' },
  { text: 'Keep your', highlight: 'notes together.' },
  { text: 'See your', highlight: 'progress.' },
];

export function EditorialHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { openAuthModal } = useAuthModal();

  // Scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Text parallax
  const textY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Keep the preview responsive to scroll without putting its controls inside
  // a 3D hit-testing layer. The dashboard itself is an interactive demo.
  const scrollScale = useTransform(scrollYProgress, [0, 0.3], [1.05, 1]);
  const dashboardY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const dashboardOpacity = useTransform(scrollYProgress, [0.4, 0.7], [1, 0]);

  return (
    <section ref={containerRef} className="relative flex min-h-screen items-center py-20 lg:py-0">
      {/* Ambient background gradient */}
      <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-b via-transparent to-transparent" />

      <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col gap-16 xl:flex-row xl:items-center xl:justify-between xl:gap-24 2xl:gap-32">
          {/* Left Side - Editorial Typography */}
          <motion.div
            style={{ y: textY, opacity: textOpacity }}
            className="relative z-10 w-full space-y-8 xl:max-w-xl"
          >
            {/* Eyebrow */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">
                Save your work
              </span>
            </motion.div>

            {/* Main Headline - Rotating Headlines */}
            <RotatingHeadline headlines={jobmarkHeadlines} interval={3000} />

            {/* Subheadline */}
            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-muted-foreground max-w-lg text-xl leading-relaxed"
            >
              Jobmark gives you one place to write down what you did, fixed, and learned. Use those
              notes later for reviews and updates.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center"
            >
              <button
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
            </motion.div>

            {/* Subtle trust indicator */}
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-muted-foreground/60 text-sm"
            >
              Free to start. Your notes are yours.
            </motion.p>
          </motion.div>

          {/* Right Side - Linear-style 3D Dashboard */}
          <motion.div
            style={{ y: dashboardY, opacity: dashboardOpacity }}
            className="w-full min-w-0 xl:max-w-[1000px] xl:flex-1"
          >
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ scale: scrollScale }}
              className="relative w-full min-w-0"
            >
              <div className="relative">
                {/* Aurora glow effect - animated gradient behind dashboard */}
                <div className="pointer-events-none absolute -inset-12 opacity-60 lg:-inset-16">
                  {/* Primary aurora layer */}
                  <motion.div
                    animate={{
                      background: [
                        'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212, 165, 116, 0.4) 0%, transparent 70%)',
                        'radial-gradient(ellipse 60% 60% at 40% 50%, rgba(212, 165, 116, 0.3) 0%, transparent 70%)',
                        'radial-gradient(ellipse 70% 50% at 60% 50%, rgba(212, 165, 116, 0.35) 0%, transparent 70%)',
                        'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212, 165, 116, 0.4) 0%, transparent 70%)',
                      ],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 blur-3xl"
                  />
                  {/* Secondary warm layer */}
                  <motion.div
                    animate={{
                      background: [
                        'radial-gradient(ellipse 50% 80% at 60% 40%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)',
                        'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(227, 178, 131, 0.2) 0%, transparent 60%)',
                        'radial-gradient(ellipse 50% 80% at 40% 60%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)',
                        'radial-gradient(ellipse 50% 80% at 60% 40%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)',
                      ],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="absolute inset-0 blur-2xl"
                  />
                </div>

                {/* Dashboard container with border glow */}
                <div className="group relative">
                  {/* Animated border glow */}
                  <div className="from-primary/50 via-primary/20 to-primary/50 pointer-events-none absolute -inset-px rounded-xl bg-linear-to-br opacity-50 blur-sm transition-opacity duration-500 group-hover:opacity-70" />

                  {/* Subtle animated shine on border */}
                  <motion.div
                    animate={{
                      background: [
                        'linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.3) 50%, transparent 100%)',
                        'linear-gradient(90deg, transparent 100%, rgba(212, 165, 116, 0.3) 150%, transparent 200%)',
                      ],
                      backgroundPosition: ['-100% 0%', '200% 0%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      repeatDelay: 2,
                    }}
                    className="pointer-events-none absolute -inset-px rounded-xl opacity-40"
                    style={{ backgroundSize: '200% 100%' }}
                  />

                  {/* Main dashboard */}
                  <div className="border-border/40 bg-card/80 relative overflow-hidden rounded-xl border shadow-2xl shadow-black/30 backdrop-blur-sm">
                    <DemoDashboard />
                  </div>

                  {/* Reflection effect at bottom */}
                  <div
                    className="from-card/10 pointer-events-none absolute right-4 -bottom-8 left-4 h-16 rounded-xl bg-linear-to-b to-transparent opacity-30 blur-xl"
                    style={{ transform: 'rotateX(180deg) translateZ(-10px)' }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
