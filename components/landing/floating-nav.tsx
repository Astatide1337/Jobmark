/**
 * Intelligent Floating Navigation
 *
 * Why: Maintains access to primary CTAs without occupying permanent
 * vertical space. It follows a "Scroll-Aware" pattern.
 *
 * Behavior:
 * - Hidden on Scroll Down: To give the user more focus on the content.
 * - Shown on Scroll Up: Anticipates the user's desire to navigate or sign up.
 * - Glassmorphism: Uses `backdrop-blur` to stay legible over any background.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Pen } from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { useAuthModal } from '@/components/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Features', href: '#product-tour' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Articles', href: '/articles' },
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
            ease: [0.4, 0, 0.2, 1],
          }}
          className={cn(
            'fixed top-6 left-1/2 z-50 -translate-x-1/2',
            'rounded-full px-2 py-2',
            'border-border/20 border',
            'backdrop-blur-xl',
            'shadow-lg shadow-black/10',
            isAtTop ? 'bg-background/60' : 'bg-background/90'
          )}
        >
          <div className="flex items-center gap-1">
            {/* Logo */}
            <MagneticButton as="div" strength={0.2}>
              <Link
                href="/"
                className="hover:bg-primary/10 flex items-center gap-2 rounded-full px-3 py-2 transition-colors"
              >
                <div className="bg-primary/10 border-primary/20 flex h-6 w-6 items-center justify-center rounded-md border">
                  <Pen className="text-primary h-3 w-3" />
                </div>
                <span className="text-foreground hidden font-serif text-sm font-semibold sm:inline">
                  Jobmark
                </span>
              </Link>
            </MagneticButton>

            {/* Divider */}
            <div className="bg-border/30 mx-1 hidden h-6 w-px sm:block" />

            {/* Nav Items */}
            <div className="hidden items-center gap-1 sm:flex">
              {navItems.map(item => (
                <MagneticButton key={item.label} as="div" strength={0.15}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground hover:bg-primary/5 focus-visible:ring-ring/50 focus-visible:text-foreground rounded-full px-3 py-2 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>
                </MagneticButton>
              ))}
            </div>

            {/* Divider */}
            <div className="bg-border/30 mx-1 h-6 w-px" />

            {/* CTA */}
            <MagneticButton as="div" strength={0.2}>
              <button
                onClick={openAuthModal}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-medium transition-colors"
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
