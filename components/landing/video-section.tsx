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
              See Jobmark <span className="text-primary">in action</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground max-w-lg text-lg leading-relaxed"
            >
              Watch how easy it is to log your daily wins and generate polished reports in minutes,
              not hours.
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
                <span>2 min watch</span>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {/* Play button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-primary/10 border-primary/30 flex h-20 w-20 cursor-not-allowed items-center justify-center rounded-full border"
                >
                  <div className="bg-primary/20 flex h-14 w-14 items-center justify-center rounded-full">
                    <Play className="text-primary ml-1 h-6 w-6" />
                  </div>
                </motion.div>

                <div className="text-center">
                  <p className="text-muted-foreground font-medium">Demo Coming Soon</p>
                  <p className="text-muted-foreground/60 mt-1 text-sm">
                    We're putting the finishing touches on it
                  </p>
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
