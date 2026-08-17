'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

/** Editorial copy stays readable on first paint; scroll adds subtle depth only. */
export function ProblemStatement() {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], prefersReducedMotion ? [0, 0, 0, 0] : [26, 0, 0, -22]);

  return (
    <section ref={ref} className="relative overflow-hidden py-20 md:py-28">
      <div className="via-primary/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <motion.div style={{ y }} className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="text-foreground/90 font-serif text-2xl leading-[1.3] sm:text-3xl md:text-4xl lg:text-5xl">
          <span className="text-muted-foreground">Work is easy to forget. </span>
          <span className="text-foreground">The details disappear first.</span>
          <span className="text-muted-foreground">
            {' '}
            A fix in Slack, a decision in a meeting, or a launch that took a month can be hard to remember by review time.
          </span>
          <br />
          <span className="text-primary">Write it down once. Find it when you need it.</span>
        </p>

        <motion.div
          className="bg-primary/50 mx-auto mt-12 h-px w-24 origin-center"
          initial={prefersReducedMotion ? false : { scaleX: 0.2 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
        />

        <motion.p
          initial={prefersReducedMotion ? false : { y: 14 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.08 }}
          className="text-muted-foreground mt-8 text-lg"
        >
          Jobmark keeps those notes in one place.
        </motion.p>
      </motion.div>
    </section>
  );
}
