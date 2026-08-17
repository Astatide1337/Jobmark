'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeading } from './section-heading';

const faqs = [
  {
    id: 'what-is',
    question: 'What is Jobmark?',
    answer:
      'Jobmark is a place to save work notes, group them by project, and use them later for review drafts, updates, and planning.',
  },
  {
    id: 'notes-app',
    question: 'Is Jobmark just a notes app?',
    answer:
      'Notes are the source of truth, but Jobmark also gives them structure through projects, goals, review drafts, insights, conversations, exports, and assistant connections.',
  },
  {
    id: 'docs',
    question: 'Why not use Docs or Notion?',
    answer:
      'You can. Jobmark is narrower: it is organized around keeping a usable record of work and reusing that record when a review or update comes around.',
  },
  {
    id: 'assistant',
    question: 'Can I connect an AI assistant?',
    answer:
      'Yes. Jobmark supports MCP connections for Claude, ChatGPT, Gemini, and other compatible assistants. You choose when to connect one.',
  },
  {
    id: 'export',
    question: 'Can I download my data?',
    answer: 'Yes. You can export your record from Jobmark and use it somewhere else.',
  },
  {
    id: 'private-projects',
    question: 'Can I protect private projects?',
    answer:
      'Yes. Jobmark includes a vault flow for private projects so protected project data can stay locked until you unlock it.',
  },
] as const;

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>('what-is');

  return (
    <section id="faq" className="border-border/30 border-t py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Common questions"
          description="What Jobmark does, what it does not replace, and what stays under your control."
          align="center"
        />

        <div className="mt-12 space-y-2">
          {faqs.map(faq => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={cn(
                  'rounded-xl border transition-[border-color,background-color] duration-200',
                  isOpen
                    ? 'border-border/60 bg-card/60'
                    : 'border-border/30 bg-card/20 hover:border-border/50 hover:bg-card/40'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(current => (current === faq.id ? null : faq.id))}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${faq.id}-content`}
                  className="focus-visible:ring-ring/50 flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>

                <div
                  id={`faq-${faq.id}-content`}
                  aria-hidden={!isOpen}
                  className={cn(
                    'grid overflow-hidden transition-[grid-template-rows] duration-200',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="text-muted-foreground border-border/30 mx-5 border-t pt-4 pb-5 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
