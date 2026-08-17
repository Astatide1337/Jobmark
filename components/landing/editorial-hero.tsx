'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthModal } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { DashboardPreview } from './dashboard-preview';
import { landingDuration, landingEase } from './motion';
import { useMotionPreference } from './use-motion-preference';

export function EditorialHero() {
  const { openAuthModal } = useAuthModal();
  const prefersReducedMotion = useMotionPreference();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-36 lg:pt-40 lg:pb-28">
      <div className="from-primary/8 pointer-events-none absolute inset-0 bg-linear-to-b via-transparent to-transparent" />
      <motion.div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute top-24 left-1/2 h-[28rem] w-[48rem] max-w-[90vw] -translate-x-1/2 rounded-full blur-3xl"
        animate={
          prefersReducedMotion
            ? undefined
            : { opacity: [0.45, 0.7, 0.45], scale: [0.98, 1.04, 0.98] }
        }
        transition={{
          duration: landingDuration.ambient,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="bg-primary/50 h-px w-10" />
            <span className="text-primary font-mono text-xs font-medium tracking-[0.14em] uppercase sm:text-sm">
              Work notes you can use later
            </span>
            <div className="bg-primary/50 h-px w-10" />
          </div>

          <h1 className="font-serif text-4xl leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Remember your work.
            <span className="text-primary block">Use it when it matters.</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-7 max-w-2xl text-lg leading-relaxed sm:text-xl">
            Save a short note while the work is fresh. Group notes by project, build a review draft,
            or connect the assistant you already use.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticButton as="div" strength={0.1}>
              <Button size="lg" onClick={openAuthModal} className="group min-w-40">
                Add a note
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </MagneticButton>
            <Button variant="outline" size="lg" asChild className="min-w-40">
              <Link href="#product-tour">See how it works</Link>
            </Button>
          </div>

          <p className="text-muted-foreground/70 mt-4 text-sm">
            Start with one note. Export your record any time.
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : landingDuration.slow,
            delay: prefersReducedMotion ? 0 : 0.08,
            ease: landingEase,
          }}
          className="relative mx-auto mt-14 max-w-6xl sm:mt-16 lg:mt-20"
        >
          <div className="from-primary/20 via-primary/5 pointer-events-none absolute -inset-5 rounded-[2rem] bg-linear-to-br to-transparent blur-2xl" />
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}
