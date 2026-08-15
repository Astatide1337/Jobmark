/**
 * Product film section.
 *
 * Why: The film shows the product's actual rhythm more clearly than a static
 * feature list: make a note, keep the context, and come back to it later.
 */
'use client';

import { Clock3, VolumeX } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { JOBMARK_PRODUCT_VIDEO_URL } from '@/components/brand/brand-assets';

export function VideoSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-24 lg:py-32"
      aria-labelledby="product-film-title"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-20">
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
                A look inside
              </span>
            </div>

            <h2
              id="product-film-title"
              className="font-serif text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              From a quick note to a clear review.
            </h2>

            <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
              Write down what happened while it is fresh. When the conversation comes around, you
              have the details—not a blank document and a vague feeling that you did a lot.
            </p>

            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-3 pt-1 text-sm">
              <span className="flex items-center gap-2">
                <Clock3 className="text-primary h-4 w-4" aria-hidden="true" />
                45-second product film
              </span>
              <span className="flex items-center gap-2">
                <VolumeX className="text-primary h-4 w-4" aria-hidden="true" />
                Plays silently
              </span>
            </div>
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

              <div className="absolute top-5 left-5 z-20 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-black/60 uppercase backdrop-blur-sm">
                Jobmark / in practice
              </div>
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
