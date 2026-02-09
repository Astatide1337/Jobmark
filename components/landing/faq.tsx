"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    id: "what-is",
    question: "What is Jobmark exactly?",
    answer:
      "Jobmark is a work journal—a place to log what you've accomplished each day. Think of it as a reverse TODO list. Instead of tracking what you need to do, you track what you've done. AI then helps you turn these notes into polished reports for standups, performance reviews, or your own records.",
  },
  {
    id: "different",
    question: "How is this different from a notes app or TODO list?",
    answer:
      "Notes apps are unstructured—great for capturing ideas, but hard to search and report on. TODO lists create pressure and anxiety about uncompleted tasks. Jobmark is purpose-built for accomplishments: structured enough to be useful, but simple enough that logging takes seconds. Plus, AI transforms your raw notes into professional narratives.",
  },
  {
    id: "data-safe",
    question: "Is my data safe?",
    answer:
      "Yes. Your data is encrypted at rest and in transit. We don't sell your data, and we don't train AI models on your entries without explicit consent. You can export all your data anytime, and you can delete your account completely—we don't keep shadow copies.",
  },
  {
    id: "ai-work",
    question: "How does the AI work?",
    answer:
      "When you generate a report, the AI reads your journal entries for the selected time period and synthesizes them into a coherent narrative. You choose the tone (professional, casual, bullet points) and the AI adapts. The AI Mentor uses the same context to give you personalized productivity advice based on your actual work patterns.",
  },
  {
    id: "free",
    question: "Is Jobmark free?",
    answer:
      "Yes, you can start for free with generous limits. We may introduce paid tiers in the future for power users who want unlimited AI generations, team features, or advanced analytics—but there will always be a free tier for individual use.",
  },
  {
    id: "time",
    question: "How much time does this take each day?",
    answer:
      "Most users spend 30 seconds to 2 minutes per entry. The goal is to capture wins while they're fresh, not to write essays. A quick 'Shipped the login feature' is enough. The AI fills in the narrative later when you need a polished report.",
  },
  {
    id: "mobile",
    question: "Is there a mobile app?",
    answer:
      "The web app is fully responsive and works great on mobile browsers. A native mobile app is on our roadmap for quick capture on the go, but the current web experience is designed to be fast and thumb-friendly.",
  },
  {
    id: "import",
    question: "Can I import data from other tools?",
    answer:
      "Not yet, but it's on our roadmap. We're planning integrations with common tools like Notion, Todoist, and calendar apps to auto-capture completed tasks. For now, manual entry keeps things simple and intentional.",
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>("what-is");

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="relative py-32 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="h-px w-12 bg-primary/50" />
            <span className="text-sm font-mono text-primary tracking-wide uppercase">
              FAQ
            </span>
            <div className="h-px w-12 bg-primary/50" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-bold mb-4"
          >
            Questions & Answers
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
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
          className="text-center text-muted-foreground mt-12"
        >
          Have another question?{" "}
          <a
            href="mailto:hello@jobmark.app"
            className="text-primary hover:underline underline-offset-4"
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
          ? "border-border/40 bg-card/50"
          : "border-border/20 bg-card/20 hover:border-border/30 hover:bg-card/30"
      }`}
    >
      {/* Question - Always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer group"
      >
        <span
          className={`text-base font-medium transition-colors ${
            isOpen ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
          }`}
        >
          {faq.question}
        </span>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 text-muted-foreground"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Answer - Expandable */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.25 },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="h-px bg-border/20 mb-4" />
              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
