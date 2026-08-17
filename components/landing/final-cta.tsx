'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthModal } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { landingDuration, landingEase } from './motion';
import { useMotionPreference } from './use-motion-preference';

export function FinalCTA() {
  const { openAuthModal } = useAuthModal();
  const prefersReducedMotion = useMotionPreference();

  return (
    <section className="border-border/30 relative overflow-hidden border-t py-24 sm:py-28 lg:py-36">
      <motion.div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-0 bg-linear-to-t via-transparent to-transparent"
        animate={prefersReducedMotion ? undefined : { opacity: [0.65, 1, 0.65] }}
        transition={{ duration: landingDuration.ambient, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{
          duration: prefersReducedMotion ? 0 : landingDuration.slow,
          ease: landingEase,
        }}
        className="relative mx-auto max-w-3xl px-6 text-center"
      >
        <p className="text-primary font-mono text-xs font-medium tracking-[0.14em] uppercase sm:text-sm">
          Start with one note
        </p>
        <h2 className="mt-5 font-serif text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Give your future self something useful to start from.
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg leading-relaxed">
          Save what happened while it is clear. Jobmark keeps the record ready for the next update,
          review, or project check-in.
        </p>

        <div className="mt-8 flex justify-center">
          <MagneticButton as="div" strength={0.1}>
            <Button size="lg" onClick={openAuthModal} className="group min-w-40">
              Add a note
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </MagneticButton>
        </div>
      </motion.div>
    </section>
  );
}
