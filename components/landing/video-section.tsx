"use client";

import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";

export function VideoSection() {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Text content */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="h-px w-12 bg-primary/50" />
              <span className="text-sm font-mono text-primary tracking-wide uppercase">
                Demo
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight"
            >
              See Jobmark{" "}
              <span className="text-primary">in action</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground leading-relaxed max-w-lg"
            >
              Watch how easy it is to log your daily wins and generate polished reports 
              in minutes, not hours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-4 pt-2 text-sm text-muted-foreground"
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
            <div className="relative aspect-video rounded-xl border border-border/40 bg-card/60 overflow-hidden group">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
              
              {/* Grid pattern */}
              <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(rgba(212, 165, 116, 0.5) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(212, 165, 116, 0.5) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px'
                }}
              />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {/* Play button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center cursor-not-allowed"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <Play className="h-6 w-6 text-primary ml-1" />
                  </div>
                </motion.div>
                
                <div className="text-center">
                  <p className="text-muted-foreground font-medium">Demo Coming Soon</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">We're putting the finishing touches on it</p>
                </div>
              </div>

              {/* Subtle animated border glow */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-xl border border-primary/20 pointer-events-none"
              />
            </div>

            {/* Reflection */}
            <div className="absolute -bottom-4 left-8 right-8 h-8 bg-gradient-to-b from-primary/5 to-transparent rounded-xl blur-xl opacity-50" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
