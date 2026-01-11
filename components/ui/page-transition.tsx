"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Page Transition Wrapper
 * Provides smooth fade-slide animations between pages
 * 
 * Psychology: Smooth transitions reduce cognitive load
 * and make navigation feel more natural and premium
 */

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
