"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoDashboard } from "./demos/demo-dashboard";
import { RotatingHeadline, jobmarkHeadlines } from "@/components/ui/rotating-headline";
import { useAuthModal } from "@/components/auth";

export function EditorialHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const { openAuthModal } = useAuthModal();

  // Scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Text parallax
  const textY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Dashboard scroll transforms - flattens as user scrolls
  const scrollRotateX = useTransform(scrollYProgress, [0, 0.6], [12, 0]);
  const scrollRotateY = useTransform(scrollYProgress, [0, 0.6], [-6, 0]);
  const scrollScale = useTransform(scrollYProgress, [0, 0.3], [1.05, 1]);
  const dashboardY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const dashboardOpacity = useTransform(scrollYProgress, [0.4, 0.7], [1, 0]);

  // Mouse tracking for tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const tiltX = useSpring(mouseX, springConfig);
  const tiltY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dashboardRef.current || !isHovering) return;

      const rect = dashboardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center (-1 to 1)
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);

      // Apply subtle tilt based on mouse position (max 3 degrees)
      mouseX.set(y * 3);  // Inverted for natural feel
      mouseY.set(-x * 3);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isHovering, mouseX, mouseY]);

  // Reset tilt when not hovering
  useEffect(() => {
    if (!isHovering) {
      mouseX.set(0);
      mouseY.set(0);
    }
  }, [isHovering, mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center py-20 lg:py-0"
    >
      {/* Ambient background gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-16 lg:gap-24 xl:gap-32">
          {/* Left Side - Editorial Typography */}
          <motion.div
            style={{ y: textY, opacity: textOpacity }}
            className="lg:max-w-xl space-y-8 relative z-10"
          >
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="h-px w-12 bg-primary/50" />
              <span className="text-sm font-mono text-primary tracking-wide uppercase">
                Work Journal
              </span>
            </motion.div>

            {/* Main Headline - Rotating Headlines */}
            <RotatingHeadline
              headlines={jobmarkHeadlines}
              interval={3000}
            />

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-lg"
            >
              The work journal that writes your reports for you. Capture accomplishments in 30 seconds, generate polished reports with AI.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
            >
              <button
                onClick={openAuthModal}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium text-base hover:bg-primary/90 transition-colors"
              >
                Start Your Journal
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link
                href="#product-tour"
                className="inline-flex items-center gap-2 px-6 py-4 text-muted-foreground hover:text-foreground transition-colors text-base"
              >
                See how it works
              </Link>
            </motion.div>

            {/* Subtle trust indicator */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-sm text-muted-foreground/60"
            >
              Free to start. No credit card required.
            </motion.p>
          </motion.div>

          {/* Right Side - Linear-style 3D Dashboard */}
          <motion.div
            style={{
              y: dashboardY,
              opacity: dashboardOpacity,
            }}
            className="lg:flex-1 lg:max-w-[1000px] perspective-1200"
          >
            <motion.div
              ref={dashboardRef}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              initial={{ opacity: 0, y: 80, rotateX: 25, rotateY: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 12, rotateY: -6 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transformStyle: "preserve-3d",
                rotateX: scrollRotateX,
                rotateY: scrollRotateY,
                scale: scrollScale,
              }}
              className="relative"
            >
              {/* Mouse-tracking tilt layer */}
              <motion.div
                style={{
                  rotateX: tiltX,
                  rotateY: tiltY,
                  transformStyle: "preserve-3d",
                }}
                className="relative"
              >
                {/* Aurora glow effect - animated gradient behind dashboard */}
                <div className="absolute -inset-12 lg:-inset-16 opacity-60">
                  {/* Primary aurora layer */}
                  <motion.div
                    animate={{
                      background: [
                        "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212, 165, 116, 0.4) 0%, transparent 70%)",
                        "radial-gradient(ellipse 60% 60% at 40% 50%, rgba(212, 165, 116, 0.3) 0%, transparent 70%)",
                        "radial-gradient(ellipse 70% 50% at 60% 50%, rgba(212, 165, 116, 0.35) 0%, transparent 70%)",
                        "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212, 165, 116, 0.4) 0%, transparent 70%)",
                      ],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 blur-3xl"
                  />
                  {/* Secondary warm layer */}
                  <motion.div
                    animate={{
                      background: [
                        "radial-gradient(ellipse 50% 80% at 60% 40%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)",
                        "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(227, 178, 131, 0.2) 0%, transparent 60%)",
                        "radial-gradient(ellipse 50% 80% at 40% 60%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)",
                        "radial-gradient(ellipse 50% 80% at 60% 40%, rgba(227, 178, 131, 0.25) 0%, transparent 60%)",
                      ],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute inset-0 blur-2xl"
                  />
                </div>

                {/* Dashboard container with border glow */}
                <div className="relative group">
                  {/* Animated border glow */}
                  <div className="absolute -inset-px rounded-xl bg-linear-to-br from-primary/50 via-primary/20 to-primary/50 opacity-50 group-hover:opacity-70 transition-opacity duration-500 blur-sm" />
                  
                  {/* Subtle animated shine on border */}
                  <motion.div
                    animate={{
                      background: [
                        "linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.3) 50%, transparent 100%)",
                        "linear-gradient(90deg, transparent 100%, rgba(212, 165, 116, 0.3) 150%, transparent 200%)",
                      ],
                      backgroundPosition: ["-100% 0%", "200% 0%"],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                    className="absolute -inset-px rounded-xl opacity-40"
                    style={{ backgroundSize: "200% 100%" }}
                  />

                  {/* Main dashboard */}
                  <div 
                    className="relative rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/30"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    <DemoDashboard />
                  </div>

                  {/* Reflection effect at bottom */}
                  <div 
                    className="absolute -bottom-8 left-4 right-4 h-16 bg-linear-to-b from-card/10 to-transparent rounded-xl blur-xl opacity-30"
                    style={{ transform: "rotateX(180deg) translateZ(-10px)" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

    </section>
  );
}
