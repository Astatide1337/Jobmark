"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
  maxWidth?: string;
  delay?: number;
  glow?: boolean;
}

export function SectionDivider({
  className,
  maxWidth = "max-w-4xl",
  delay = 0,
  glow = false,
}: SectionDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full flex items-center justify-center py-8 md:py-12 px-6",
        className
      )}
    >
      {/* Optional glow effect */}
      {glow && (
        <motion.div
          className={cn("absolute h-px", maxWidth, "w-full")}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: delay + 0.4 }}
        >
          <div className="absolute inset-0 bg-primary/20 blur-md" />
        </motion.div>
      )}

      {/* Left line - draws from left edge toward center */}
      <motion.div
        className={cn(
          "flex-1 h-px bg-gradient-to-r from-transparent to-border/40",
          maxWidth ? `${maxWidth.replace('max-w-', 'max-w-[')}` : ""
        )}
        style={{ maxWidth: "50%" }}
        initial={{ scaleX: 0, opacity: 0, originX: 0 }}
        animate={
          isInView
            ? { scaleX: 1, opacity: 1 }
            : { scaleX: 0, opacity: 0 }
        }
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      />

      {/* Right line - draws from right edge toward center */}
      <motion.div
        className="flex-1 h-px bg-gradient-to-l from-transparent to-border/40"
        style={{ maxWidth: "50%" }}
        initial={{ scaleX: 0, opacity: 0, originX: 1 }}
        animate={
          isInView
            ? { scaleX: 1, opacity: 1 }
            : { scaleX: 0, opacity: 0 }
        }
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      />
    </div>
  );
}
