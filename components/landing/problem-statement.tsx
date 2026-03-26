/**
 * Landing Page Problem Statement
 *
 * Why: Before presenting the solution, we must empathize with the user's pain.
 * This section uses high-contrast typography and scroll-triggered animations
 * to highlight the friction of "Performance Review Scrambling."
 */
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function ProblemStatement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [50, 0, 0, -50]);

  return (
    <section ref={containerRef} className="relative overflow-hidden py-20 md:py-28">
      {/* Subtle background texture */}
      <div className="via-primary/[0.02] absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <motion.div style={{ opacity, y }} className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-foreground/90 font-serif text-2xl leading-[1.3] sm:text-3xl md:text-4xl lg:text-5xl">
          <span className="text-muted-foreground">You do real work every week, but </span>
          <span className="text-foreground">the evidence fades fast.</span>
          <span className="text-muted-foreground">
            {' '}
            Wins get buried in Slack. Self-assessments become vague. Promotion cases feel thin.
          </span>
          <span className="text-primary"> Visibility drops.</span>
        </p>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-primary/50 mx-auto mt-12 h-px w-24 origin-left"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-muted-foreground mt-8 text-lg"
        >
          Jobmark turns daily work into a career-ready record.
        </motion.p>
      </motion.div>
    </section>
  );
}
