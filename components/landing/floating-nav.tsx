'use client';

import Link from 'next/link';
import { useAuthModal } from '@/components/auth';
import { JobmarkMark } from '@/components/brand/jobmark-mark';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'How it works', href: '#product-tour' },
  { label: 'Use cases', href: '#use-cases' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Guides', href: '/articles' },
];

export function FloatingNav() {
  const { openAuthModal } = useAuthModal();

  return (
    <nav
      aria-label="Main navigation"
      className="border-border/40 bg-background/85 fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-2xl border px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="shrink-0 px-2.5">
          <Link href="/" aria-label="Jobmark home">
            <span className="bg-primary flex h-6 w-6 items-center justify-center rounded-md">
              <JobmarkMark className="h-4 w-4" sizes="16px" />
            </span>
            <span className="hidden font-serif font-semibold sm:inline">Jobmark</span>
          </Link>
        </Button>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map(item => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>

        <Button size="sm" onClick={openAuthModal}>
          Add a note
        </Button>
      </div>
    </nav>
  );
}
