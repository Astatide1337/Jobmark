/** Scroll-aware public navigation with keyboard-safe visibility behavior. */
'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthModal } from '@/components/auth';
import { JobmarkMark } from '@/components/brand/jobmark-mark';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { useMotionPreference } from './use-motion-preference';

const navItems = [
  { label: 'How it works', href: '#product-tour' },
  { label: 'Add a note', href: '#access' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Guides', href: '/articles' },
];

export function FloatingNav() {
  const { openAuthModal } = useAuthModal();
  const prefersReducedMotion = useMotionPreference();
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY.current;
        const focusInsideNav = document.activeElement?.closest('[data-floating-nav]') !== null;
        setAtTop(currentY < 48);
        if (!focusInsideNav && Math.abs(delta) > 8) {
          setVisible(delta < 0 || currentY < 120);
        }
        lastY.current = currentY;
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.nav
          data-floating-nav
          aria-label="Main navigation"
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: -18, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`border-border/20 fixed top-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-max -translate-x-1/2 rounded-full border px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 ${
            atTop ? 'bg-background/65' : 'bg-background/90 shadow-black/15'
          }`}
        >
          <div className="flex items-center gap-1">
            <MagneticButton as="div" strength={0.08}>
              <Link
                href="/"
                className="hover:bg-primary/10 focus-visible:ring-ring/50 text-foreground flex items-center gap-2 rounded-full px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-md">
                  <JobmarkMark className="h-4 w-4" sizes="16px" />
                </div>
                <span className="hidden font-serif text-sm font-semibold sm:inline">Jobmark</span>
              </Link>
            </MagneticButton>

            <div className="bg-border/30 mx-1 hidden h-6 w-px sm:block" />
            <div className="hidden items-center gap-1 sm:flex">
              {navItems.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-muted-foreground hover:bg-primary/5 hover:text-foreground focus-visible:ring-ring/50 focus-visible:text-foreground rounded-full px-3 py-2 text-sm transition-[color,background-color] focus-visible:ring-2 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="bg-border/30 mx-1 h-6 w-px" />
            <MagneticButton as="div" strength={0.1}>
              <button
                type="button"
                onClick={openAuthModal}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Add a note
              </button>
            </MagneticButton>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
