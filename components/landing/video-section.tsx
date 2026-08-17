'use client';

import { motion } from 'framer-motion';
import { JOBMARK_PRODUCT_VIDEO_URL } from '@/components/brand/brand-assets';
import { landingDuration, landingEase } from './motion';
import { SectionHeading } from './section-heading';
import { useMotionPreference } from './use-motion-preference';

export function VideoSection() {
  const prefersReducedMotion = useMotionPreference();

  return (
    <section className="border-border/30 border-t py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <SectionHeading
            eyebrow="See the product"
            title="See the Jobmark workflow end to end."
            description="Capture a note, put it in a project, and build a review draft from the same record. The product video shows that workflow directly."
          />

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: prefersReducedMotion ? 0 : landingDuration.slow,
              ease: landingEase,
            }}
            className="relative"
          >
            <div className="from-primary/15 via-primary/5 pointer-events-none absolute -inset-5 rounded-[2rem] bg-linear-to-br to-transparent blur-2xl" />
            <div className="border-border/50 bg-card relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-2xl border shadow-xl shadow-black/15">
              <video
                className="h-full w-full object-contain"
                src={JOBMARK_PRODUCT_VIDEO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Jobmark product video showing notes, projects, and review drafts"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
