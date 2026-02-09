"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Pen } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { useAuthModal } from "@/components/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Features", href: "#product-tour" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function FloatingNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = currentScrollY - lastScrollY.current;
          
          // Only change visibility if scroll delta is significant (prevents flicker)
          if (Math.abs(scrollDelta) > 5) {
            if (scrollDelta < 0 || currentScrollY < 100) {
              setIsVisible(true);
            } else if (scrollDelta > 0 && currentScrollY > 100) {
              setIsVisible(false);
            }
          }
          
          setIsAtTop(currentScrollY < 50);
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.nav
          key="floating-nav"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            duration: 0.2, 
            ease: [0.4, 0, 0.2, 1]
          }}
          className={cn(
            "fixed top-6 left-1/2 -translate-x-1/2 z-50",
            "px-2 py-2 rounded-full",
            "border border-border/20",
            "backdrop-blur-xl",
            "shadow-lg shadow-black/10",
            isAtTop ? "bg-background/60" : "bg-background/90"
          )}
        >
          <div className="flex items-center gap-1">
            {/* Logo */}
            <MagneticButton as="div" strength={0.2}>
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-primary/10 transition-colors"
              >
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Pen className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-serif font-semibold text-foreground hidden sm:inline">
                  Jobmark
                </span>
              </Link>
            </MagneticButton>

            {/* Divider */}
            <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

            {/* Nav Items */}
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => (
                <MagneticButton key={item.label} as="div" strength={0.15}>
                  <Link
                    href={item.href}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-primary/5"
                  >
                    {item.label}
                  </Link>
                </MagneticButton>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border/30 mx-1" />

            {/* CTA */}
            <MagneticButton as="div" strength={0.2}>
              <button
                onClick={openAuthModal}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              >
                Get Started
              </button>
            </MagneticButton>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
