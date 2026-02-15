"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page Transition Wrapper
 * Provides smooth fade-slide animations between pages
 * 
 * Psychology: Smooth transitions reduce cognitive load
 * and make navigation feel more natural and premium
 */

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -8,
    },
  };

  const pageTransition = {
    type: "tween" as const,
    ease: "easeOut" as const,
    duration: 0.2,
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={cn("flex-1 min-h-0 flex flex-col", className)}
    >
      {children}
    </motion.div>
  );
}
