/**
 * Final Call-to-Action (CTA) Section
 *
 * Why: The "closing argument" of the landing page. It provides
 * one last high-impact invitation to start a journal.
 *
 * Components: Uses the `MagneticButton` for a playful interaction
 * that increases the click-through rate.
 */
'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { useAuthModal } from '@/components/auth';

export function FinalCTA() {
  const { openAuthModal } = useAuthModal();

  return (
    <section className="relative overflow-hidden py-32 md:py-48">
      {/* Background gradient */}
      <div className="from-primary/10 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          {/* Headline */}
          <h2 className="font-serif text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
            Start your work journal
            <span className="text-primary block">today.</span>
          </h2>

          {/* Subtext */}
          <p className="text-muted-foreground mx-auto max-w-xl text-xl">
            It's free. No credit card. Just you and your wins.
          </p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <MagneticButton strength={0.15}>
              <button
                onClick={openAuthModal}
                className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 focus-visible:ring-primary inline-flex items-center gap-3 rounded-full px-10 py-5 text-lg font-medium transition-all hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </MagneticButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
