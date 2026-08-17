'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthModal } from '@/components/auth';
import { MagneticButton } from '@/components/ui/magnetic-button';

export function FinalCTA() {
  const { openAuthModal } = useAuthModal();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-32 md:py-48">
      <motion.div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
        animate={prefersReducedMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={prefersReducedMotion ? false : { y: 28 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-4xl space-y-8 px-6 text-center"
      >
        <h2 className="font-serif text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
          Keep your work while it is fresh.
        </h2>
        <p className="text-muted-foreground mx-auto max-w-xl text-xl">
          Start with one note. Sort it later.
        </p>

        <div className="pt-4">
          <MagneticButton strength={0.13} onClick={openAuthModal}>
            <span className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 focus-visible:ring-primary inline-flex items-center gap-3 rounded-full px-10 py-5 text-lg font-medium transition-[background-color,box-shadow] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
              Add a note
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </MagneticButton>
        </div>
      </motion.div>
    </section>
  );
}
