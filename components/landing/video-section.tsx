'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { JOBMARK_PRODUCT_VIDEO_URL } from '@/components/brand/brand-assets';

export function VideoSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-16 lg:py-24"
      aria-labelledby="product-film-title"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          <motion.div
            initial={prefersReducedMotion ? false : { x: -22 }}
            whileInView={{ x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl space-y-7"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">
                Keep your work
              </span>
            </div>
            <h2
              id="product-film-title"
              className="font-serif text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Keep the details of your work.
            </h2>
            <p className="text-foreground/75 max-w-lg text-lg leading-[1.6] sm:text-xl">
              Write down what you did while it is fresh. Add the project and a short note. When you
              need an update or review, start with your notes.
            </p>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { y: 30, rotate: 0.8 }}
            whileInView={{ y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group relative"
          >
            <motion.div
              aria-hidden="true"
              className="from-primary/10 pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br via-transparent to-transparent blur-3xl"
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: [0.45, 0.8, 0.45], scale: [0.98, 1.04, 0.98] }
              }
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="border-border/40 group-hover:border-primary/30 relative mx-auto aspect-[9/14] w-full max-w-[560px] overflow-hidden rounded-[1.75rem] border bg-[#efede7] shadow-2xl shadow-black/20 transition-[border-color,box-shadow] duration-500 group-hover:shadow-black/30 lg:aspect-[3/4]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(32, 29, 26, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(32, 29, 26, 0.08) 1px, transparent 1px)',
                  backgroundSize: '44px 44px',
                }}
              />
              <video
                className="relative z-10 mx-auto block h-full w-auto max-w-full object-contain"
                src={JOBMARK_PRODUCT_VIDEO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Jobmark product video showing notes, projects, and review drafts"
              />
              <motion.div
                aria-hidden="true"
                className="border-primary/20 pointer-events-none absolute inset-0 rounded-[1.75rem] border"
                animate={prefersReducedMotion ? undefined : { opacity: [0.25, 0.55, 0.25] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <p className="sr-only">The product video shows notes, projects, and review drafts.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
