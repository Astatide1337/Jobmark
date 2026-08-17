/**
 * Public-page navigation.
 *
 * Why: Navigation should remain available without scroll listeners, springs,
 * pointer tracking, or an animated visibility state that can hide focus.
 */
'use client';

import Link from 'next/link';
import { useAuthModal } from '@/components/auth';
import { JobmarkMark } from '@/components/brand/jobmark-mark';

const navItems = [
  { label: 'How it works', href: '#product-tour' },
  { label: 'Add a note', href: '#access' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Guides', href: '/articles' },
];

export function FloatingNav() {
  const { openAuthModal } = useAuthModal();

  return (
    <nav
      aria-label="Main navigation"
      className="border-border/20 bg-background/90 fixed top-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-max -translate-x-1/2 rounded-full border px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl"
    >
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="hover:bg-primary/10 focus-visible:ring-ring/50 text-foreground flex items-center gap-2 rounded-full px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-md">
            <JobmarkMark className="h-4 w-4" sizes="16px" />
          </div>
          <span className="hidden font-serif text-sm font-semibold sm:inline">Jobmark</span>
        </Link>

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

        <button
          type="button"
          onClick={openAuthModal}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Add a note
        </button>
      </div>
    </nav>
  );
}
