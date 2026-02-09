"use client";

import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export const TextGenerateEffect = ({
  words,
  className,
  delay = 0,
  staggerDelay = 0.08,
}: TextGenerateEffectProps) => {
  const [scope, animate] = useAnimate();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const wordsArray = words.split(" ");
  
  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
          y: 0,
        },
        {
          duration: 0.4,
          delay: stagger(staggerDelay, { startDelay: delay }),
          ease: [0.25, 0.4, 0.25, 1],
        }
      );
    }
  }, [isInView, animate, delay, staggerDelay]);

  return (
    <div ref={containerRef} className={cn("font-serif font-bold", className)}>
      <motion.div ref={scope} className="flex flex-wrap">
        {wordsArray.map((word, idx) => (
          <motion.span
            key={word + idx}
            className="inline-block opacity-0 mr-[0.25em]"
            style={{ transform: "translateY(20px)" }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

// Multi-line variant for headlines
interface TextGenerateLinesProps {
  lines: Array<{
    text: string;
    className?: string;
  }>;
  containerClassName?: string;
  delay?: number;
  staggerDelay?: number;
  lineDelay?: number;
}

export const TextGenerateLines = ({
  lines,
  containerClassName,
  delay = 0,
  staggerDelay = 0.05,
  lineDelay = 0.15,
}: TextGenerateLinesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  let globalWordIndex = 0;

  return (
    <div ref={containerRef} className={containerClassName}>
      {lines.map((line, lineIndex) => {
        const words = line.text.split(" ");
        const lineStartIndex = globalWordIndex;
        globalWordIndex += words.length;

        return (
          <div key={lineIndex} className={cn("flex flex-wrap", line.className)}>
            {words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                className="inline-block overflow-hidden mr-[0.25em]"
              >
                <motion.span
                  className="inline-block"
                  initial={{ y: 24, opacity: 0 }}
                  animate={
                    isInView
                      ? { y: 0, opacity: 1 }
                      : { y: 24, opacity: 0 }
                  }
                  transition={{
                    duration: 0.5,
                    delay: delay + lineIndex * lineDelay + wordIndex * staggerDelay,
                    ease: [0.25, 0.4, 0.25, 1],
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};
