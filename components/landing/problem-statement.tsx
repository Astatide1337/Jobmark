"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ProblemStatement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [50, 0, 0, -50]);

  return (
    <section
      ref={containerRef}
      className="relative py-20 md:py-28 overflow-hidden"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

      <motion.div
        style={{ opacity, y }}
        className="mx-auto max-w-4xl px-6 text-center"
      >
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif leading-[1.3] text-foreground/90">
          <span className="text-muted-foreground">When report time arrives, you scramble through </span>
          <span className="text-foreground">emails, chat logs, and memory.</span>
          <span className="text-muted-foreground"> You undersell yourself. Your manager sees </span>
          <span className="text-primary">incomplete work.</span>
        </p>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 h-px w-24 bg-primary/50 mx-auto origin-left"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-lg text-muted-foreground"
        >
          Jobmark fixes this.
        </motion.p>
      </motion.div>
    </section>
  );
}
