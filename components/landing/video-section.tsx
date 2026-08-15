/**
 * Product film section.
 *
 * Why: The film shows the product's actual rhythm more clearly than a static
 * feature list: make a note, keep the context, and come back to it later.
 */
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { JOBMARK_PRODUCT_VIDEO_URL } from '@/components/brand/brand-assets';

export function VideoSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-16 lg:py-24"
      aria-labelledby="product-film-title"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl space-y-7"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/50 h-px w-12" />
              <span className="text-primary font-mono text-sm tracking-wide uppercase">
                A record that stays useful
              </span>
            </div>

            <h2
              id="product-film-title"
              className="font-serif text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Keep the details that make the work yours.
            </h2>

            <p className="text-foreground/75 max-w-lg text-lg leading-[1.6] sm:text-xl">
              Capture the work while it is fresh. Keep the project, progress, and context close by.
              When an update, review, or next step comes up, you can start with the record instead
              of rebuilding the story.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="from-primary/10 pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br via-transparent to-transparent blur-3xl" />

            <div className="border-border/40 relative mx-auto aspect-[4/3] w-full max-w-[760px] overflow-hidden rounded-[1.75rem] border bg-[#efede7] shadow-2xl shadow-black/20">
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
                autoPlay={!shouldReduceMotion}
                loop={!shouldReduceMotion}
                muted
                playsInline
                controls={Boolean(shouldReduceMotion)}
                preload="metadata"
                aria-label="Jobmark product film showing a note becoming a project record, progress view, and review draft"
              />
            </div>

            <p className="sr-only">
              The product film shows a user recording a work note, grouping it into a project,
              watching progress build, and preparing a performance review draft.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
