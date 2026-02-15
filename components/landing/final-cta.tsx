"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { useAuthModal } from "@/components/auth";

export function FinalCTA() {
  const { openAuthModal } = useAuthModal();

  return (
    <section className="relative py-32 md:py-48 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />

      <div className="mx-auto max-w-4xl px-6 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold leading-tight">
            Start your work journal
            <span className="block text-primary">today.</span>
          </h2>

          {/* Subtext */}
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            It's free. No credit card. Just you and your wins.
          </p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <MagneticButton strength={0.15}>
              <button
                onClick={openAuthModal}
                className="group inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-full font-medium text-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </MagneticButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
