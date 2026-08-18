/**
 * Product Values & Philosophy
 *
 * Why: jobmark is built on specific principles (Privacy, Progress over Pressure).
 * This accordion component allows users to explore the "Why" behind the
 * features, building trust through transparency.
 *
 * Design: Features a warm-amber gradient on active items to maintain
 * the "Café" brand identity.
 */
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// All icons use warm cafe colors - variations of amber/brown
const values = [
  {
    id: 'private',
    title: 'Save what happened',
    subtitle: 'Do not rely on memory',
    description: 'A short entry today gives you a clear starting point later.',
    // Custom SVG for lock - warm amber
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  {
    id: 'no-pressure',
    title: 'Take it with you',
    subtitle: 'Your work stays yours',
    description: 'Download your record whenever you want and use it somewhere else.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'ai-ready',
    title: 'Bring help when you need it',
    subtitle: 'The assistant is optional',
    description:
      'Connect Claude, ChatGPT, or Gemini when you want another pair of eyes on a draft.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
        />
      </svg>
    ),
  },
  {
    id: 'real-people',
    title: 'Build a record over time',
    subtitle: 'Small entries add up',
    description:
      'You do not need a perfect routine. A few entries each week give you more to work with when review time comes.',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    ),
  },
];

export function ProductValues() {
  const [openId, setOpenId] = useState<string | null>('private');

  const toggleItem = (id: string) => {
    setOpenId(currentId => (currentId === id ? null : id));
  };

  return (
    <section id="values" className="relative overflow-hidden py-32">
      <div className="mx-auto max-w-4xl px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">
              How it works
            </span>
            <div className="bg-primary/50 h-px w-12" />
          </div>

          <h2 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
            A simple habit for better reviews.
          </h2>

          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Start small. Build something useful over time.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {values.map(value => (
            <AccordionItem
              key={value.id}
              value={value}
              isOpen={openId === value.id}
              onToggle={() => toggleItem(value.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AccordionItem({
  value,
  isOpen,
  onToggle,
}: {
  value: (typeof values)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      {/* Keep the background node mounted so opening an item does not remount nearby content. */}
      <div
        aria-hidden="true"
        className={`from-primary/10 via-primary/5 pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r to-transparent transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative rounded-2xl border transition-[border-color,background-color,box-shadow] duration-300 ${
          isOpen
            ? 'border-primary/30 bg-card/60 backdrop-blur-sm'
            : 'border-border/20 bg-card/30 hover:border-border/30 hover:bg-card/40'
        }`}
      >
        {/* Header - Always visible */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`value-${value.id}-content`}
          className="group flex w-full cursor-pointer items-center gap-4 p-6 text-left"
        >
          {/* Icon - all use warm primary color */}
          <div
            className={`bg-primary/10 border-primary/20 text-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border transition-[background-color,box-shadow] duration-300 ${
              isOpen ? 'shadow-sm' : 'group-hover:shadow-sm'
            }`}
          >
            {value.icon}
          </div>

          {/* Title and subtitle */}
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground text-lg font-semibold">{value.title}</h3>
            <p className="text-muted-foreground text-sm">{value.subtitle}</p>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={`text-muted-foreground h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Keep the answer mounted. Only the outer grid row changes size, so its text never fades. */}
        <div
          id={`value-${value.id}-content`}
          aria-hidden={!isOpen}
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-6 pb-6">
              <div className="bg-primary/10 mb-4 h-px" />
              <p className="text-muted-foreground pl-16 leading-relaxed">{value.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
