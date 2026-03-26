/**
 * Product Demo Video Section
 *
 * Why: Replaces abstract descriptions with concrete visual proof.
 * Even with a placeholder, it establishes the "Expectation of Quality"
 * through custom border glows and glassmorphism.
 */
'use client';

import { motion } from 'framer-motion';
import { Play, Clock } from 'lucide-react';

export function VideoSection() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left - Text content */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">Demo</span>
            </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Product <span className="text-primary">walkthrough</span>
          </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground max-w-lg text-lg leading-relaxed"
          >
            A quick, concrete look at how the career record flows from capture to review-ready
            output.
          </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-muted-foreground flex items-center gap-4 pt-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>2 min overview</span>
              </div>
            </motion.div>
          </div>

          {/* Right - Video placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="border-border/40 bg-card/60 group relative aspect-video overflow-hidden rounded-xl border">
              {/* Gradient background */}
              <div className="from-primary/5 to-primary/10 absolute inset-0 bg-gradient-to-br via-transparent" />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(rgba(212, 165, 116, 0.5) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(212, 165, 116, 0.5) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col justify-center px-8">
                <div className="bg-card/70 border-border/40 rounded-2xl border p-6 backdrop-blur-sm">
                  <div className="text-primary mb-3 text-xs font-medium tracking-wide uppercase">
                    What you will see
                  </div>
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Play className="text-primary mt-0.5 h-4 w-4" />
                      Capture a week of work in minutes, not hours.
                    </li>
                    <li className="flex items-start gap-3">
                      <Play className="text-primary mt-0.5 h-4 w-4" />
                      Turn evidence into updates and review drafts.
                    </li>
                    <li className="flex items-start gap-3">
                      <Play className="text-primary mt-0.5 h-4 w-4" />
                      Keep a portable career record you control.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Subtle animated border glow */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="border-primary/20 pointer-events-none absolute inset-0 rounded-xl border"
              />
            </div>

            {/* Reflection */}
            <div className="from-primary/5 absolute right-8 -bottom-4 left-8 h-8 rounded-xl bg-gradient-to-b to-transparent opacity-50 blur-xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
