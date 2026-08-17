/** A simple closing invitation with no scroll-triggered entrance state. */
'use client';

import { ArrowRight } from 'lucide-react';
import { useAuthModal } from '@/components/auth';

export function FinalCTA() {
  const { openAuthModal } = useAuthModal();

  return (
    <section className="relative overflow-hidden py-32 md:py-48">
      <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl space-y-8 px-6 text-center">
        <h2 className="font-serif text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
          Keep your work while it is fresh.
        </h2>

        <p className="text-muted-foreground mx-auto max-w-xl text-xl">
          Start with one note. Sort it later.
        </p>

        <div className="pt-4">
          <button
            type="button"
            onClick={openAuthModal}
            className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 focus-visible:ring-primary inline-flex items-center gap-3 rounded-full px-10 py-5 text-lg font-medium transition-[background-color,box-shadow] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Add a note
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
