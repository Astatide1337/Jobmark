/**
 * Start & Trust Section
 *
 * Why: Provide low-friction access cues without heavy pricing emphasis.
 * It reinforces ownership and choice without overpromising.
 */
'use client';

import { ArrowRight, Shield, Database, Link2 } from 'lucide-react';
import { useAuthModal } from '@/components/auth';

const accessPoints = [
  {
    title: 'Start free',
    description: 'No setup. Write your first note.',
    icon: Shield,
  },
  {
    title: 'Keep your data',
    description: 'Download your record any time.',
    icon: Database,
  },
  {
    title: 'Use your assistant',
    description: 'Connect Claude, ChatGPT, or Gemini when you want help editing a draft.',
    icon: Link2,
  },
];

export function AccessSection() {
  const { openAuthModal } = useAuthModal();

  return (
    <section id="access" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">
              Start small
            </span>
            <div className="bg-primary/50 h-px w-12" />
          </div>

          <h2 className="mb-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Get something useful from every week.
          </h2>

          <p className="text-muted-foreground text-lg">
            Start with one entry. Add more when you have something worth keeping.
          </p>
        </div>

        {/* Access cards */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {accessPoints.map(point => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="border-border/50 bg-card/60 rounded-2xl border p-6 shadow-sm"
              >
                <div className="bg-primary/10 text-primary mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{point.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={openAuthModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium transition-colors"
          >
            Add a note
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
