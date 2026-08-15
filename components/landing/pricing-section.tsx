/**
 * Start & Trust Section
 *
 * Why: Provide low-friction access cues without heavy pricing emphasis.
 * It reinforces ownership and choice without overpromising.
 */
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Database, Link2 } from 'lucide-react';
import { useAuthModal } from '@/components/auth';

const accessPoints = [
  {
    title: 'Free to begin',
    description: 'No setup ritual. Capture the first thing you want to remember.',
    icon: Shield,
  },
  {
    title: 'Yours to keep',
    description: 'Export your record whenever you need it. Your work is not trapped here.',
    icon: Database,
  },
  {
    title: 'Bring your assistant',
    description: 'Connect Claude, ChatGPT, or Gemini when you want help shaping a draft.',
    icon: Link2,
  },
];

export function AccessSection() {
  const { openAuthModal } = useAuthModal();

  return (
    <section id="access" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center justify-center gap-3"
          >
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">
              Start small
            </span>
            <div className="bg-primary/50 h-px w-12" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Make the next review easier.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Start with one note. Keep the record as it grows.
          </motion.p>
        </div>

        {/* Access cards */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {accessPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                className="border-border/50 bg-card/60 rounded-2xl border p-6 shadow-sm"
              >
                <div className="bg-primary/10 text-primary mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{point.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <button
            onClick={openAuthModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium transition-colors"
          >
            Start recording
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
