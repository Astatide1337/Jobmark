"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeadlinePart {
  text: string;
  highlight?: string;
}

interface RotatingHeadlineProps {
  headlines: HeadlinePart[];
  interval?: number;
  className?: string;
}

export function RotatingHeadline({
  headlines,
  interval = 3000,
  className = "",
}: RotatingHeadlineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
    }, interval);

    return () => clearInterval(timer);
  }, [headlines.length, interval]);

  const currentHeadline = headlines[currentIndex];

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.h1
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold leading-tight tracking-tight"
        >
          <span className="text-foreground">{currentHeadline.text}</span>
          {currentHeadline.highlight && (
            <>
              {" "}
              <span className="text-primary">{currentHeadline.highlight}</span>
            </>
          )}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}

// Pre-configured headlines for Jobmark
export const jobmarkHeadlines: HeadlinePart[] = [
  { text: "Know your", highlight: "worth." },
  { text: "Develop your", highlight: "career." },
  { text: "Achieve your", highlight: "goals." },
  { text: "Never forget a", highlight: "win." },
  { text: "Build your", highlight: "story." },
];
