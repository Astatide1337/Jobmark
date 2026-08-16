/**
 * FAQ (Frequently Asked Questions) Section
 *
 * Why: Anticipates user concerns regarding data safety, AI behavior,
 * and pricing. It provides definitive answers in a clean,
 * collapsible format to avoid information overload.
 *
 * Logic: Uses an accordion pattern with `AnimatePresence` to handle
 * height-based entry/exit animations smoothly.
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    id: 'what-is',
    question: 'What is Jobmark?',
    answer: 'Jobmark helps you save notes about your work and use them for reviews and updates.',
  },
  {
    id: 'different',
    question: 'Is Jobmark just a notes app?',
    answer:
      'It starts with notes. You can also add projects, make review drafts, and connect an assistant.',
  },
  {
    id: 'notion',
    question: 'Why not use Notion or Docs?',
    answer: 'You can. Jobmark already has a simple setup for work notes and reviews.',
  },
  {
    id: 'ai-work',
    question: 'Can I connect an assistant?',
    answer:
      'Yes. Connect Claude, ChatGPT, or Gemini if you want help editing a draft. Jobmark keeps your notes.',
  },
  {
    id: 'export',
    question: 'Can I download my notes?',
    answer: 'Yes. You can download your notes and use them somewhere else.',
  },
  {
    id: 'who',
    question: 'Who is Jobmark for?',
    answer: 'Anyone who wants to remember their work for reviews, updates, or their next job.',
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>('what-is');

  const toggleItem = (id: string) => {
    setOpenId(currentId => (currentId === id ? null : id));
  };

  return (
    <section id="faq" className="relative overflow-hidden py-32">
      {/* Subtle background gradient */}
      <div className="via-primary/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <div className="relative mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">FAQ</span>
            <div className="bg-primary/50 h-px w-12" />
          </div>

          <h2 className="mb-4 font-serif text-4xl font-bold md:text-5xl">Common questions</h2>

          <p className="text-muted-foreground text-lg">Answers to common questions.</p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2">
          {faqs.map(faq => (
            <FAQItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => toggleItem(faq.id)}
            />
          ))}
        </div>

        {/* Contact prompt */}
        <p className="text-muted-foreground mt-12 text-center">
          Have a question?{' '}
          <a
            href="mailto:hello@jobmark.app"
            className="text-primary underline-offset-4 hover:underline"
          >
            Get in touch
          </a>
        </p>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 ${
        isOpen
          ? 'border-border/40 bg-card/50'
          : 'border-border/20 bg-card/20 hover:border-border/30 hover:bg-card/30'
      }`}
    >
      {/* Question - Always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left"
      >
        <span
          className={`text-base font-medium transition-colors ${
            isOpen ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
          }`}
        >
          {faq.question}
        </span>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-muted-foreground flex-shrink-0"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      {/* Answer - Expandable */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.25 },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="bg-border/20 mb-4 h-px" />
              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
