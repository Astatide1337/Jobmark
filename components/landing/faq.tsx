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
    question: 'What is Jobmark exactly?',
    answer:
      'Jobmark is a career OS for documenting your work, building evidence of impact, and turning it into reviews, updates, and promotion-ready summaries.',
  },
  {
    id: 'different',
    question: 'Is this just a notes app?',
    answer:
      'Notes capture raw thoughts, but they do not organize evidence or turn it into career-ready output. Jobmark is structured for impact, not just storage.',
  },
  {
    id: 'notion',
    question: 'Why not just use Notion or Docs?',
    answer:
      'Generic tools are flexible, but they do not build a career record for you. Jobmark is built around evidence, timelines, and review-ready output from the start.',
  },
  {
    id: 'ai-work',
    question: 'What exactly does AI do here?',
    answer:
      'AI helps synthesize your record into summaries, drafts, and rewrites. It is an assistant layer, not the source of your work.',
  },
  {
    id: 'byok',
    question: 'What does BYOK mean here?',
    answer:
      'Bring-your-own-key support is planned so you can use your own model access over time. We are designing toward user-controlled AI without promising a timeline.',
  },
  {
    id: 'export',
    question: 'Can I export everything?',
    answer:
      'Yes. Your work record should remain portable so you can reuse it wherever you need.',
  },
  {
    id: 'who',
    question: 'Who is this for?',
    answer:
      'People who want stronger reviews, clearer promotion cases, and better weekly visibility without keeping a separate system of record.',
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>('what-is');

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="relative overflow-hidden py-32">
      {/* Subtle background gradient */}
      <div className="via-primary/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <div className="relative mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 flex items-center justify-center gap-3"
          >
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">FAQ</span>
            <div className="bg-primary/50 h-px w-12" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-4 font-serif text-4xl font-bold md:text-5xl"
          >
            Questions & Answers
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Everything you might want to know.
          </motion.p>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => toggleItem(faq.id)}
              index={index}
            />
          ))}
        </motion.div>

        {/* Contact prompt */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mt-12 text-center"
        >
          Have another question?{' '}
          <a
            href="mailto:hello@jobmark.app"
            className="text-primary underline-offset-4 hover:underline"
          >
            Get in touch
          </a>
        </motion.p>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`relative rounded-xl border transition-all duration-300 ${
        isOpen
          ? 'border-border/40 bg-card/50'
          : 'border-border/20 bg-card/20 hover:border-border/30 hover:bg-card/30'
      }`}
    >
      {/* Question - Always visible */}
      <button
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
    </motion.div>
  );
}
