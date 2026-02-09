"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

// All icons use warm cafe colors - variations of amber/brown
const values = [
  {
    id: "private",
    title: "Private by Design",
    subtitle: "Your data stays yours",
    description:
      "Everything you write is encrypted and stored securely. We never sell your data, never train AI on your entries without consent, and you can export or delete everything anytime. Privacy isn't a feature—it's foundational.",
    // Custom SVG for lock - warm amber
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: "no-pressure",
    title: "No TODO Pressure",
    subtitle: "This isn't a task list",
    description:
      "Most productivity tools create anxiety—endless lists of things you haven't done. Jobmark flips the script. You only log what you've accomplished. Every entry is a small celebration, not a nagging reminder. It's a done list, not a to-do list.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "ai-helps",
    title: "AI That Helps, Not Replaces",
    subtitle: "You write. AI polishes.",
    description:
      "The AI in Jobmark doesn't generate fake accomplishments or put words in your mouth. You capture the raw notes, and AI helps transform them into polished reports. It's a writing assistant, not a ghostwriter. Your voice, elevated.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    id: "real-people",
    title: "Built for Real People",
    subtitle: "By a developer who needed this",
    description:
      "This isn't a VC-funded growth machine optimized for engagement metrics. It's a tool built by someone who struggled to remember their own wins during performance reviews. Simple, honest, and designed to solve a real problem.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export function ProductValues() {
  const [openId, setOpenId] = useState<string | null>("private");

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="values" className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-4xl px-6">
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
              Our Values
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
            What we believe
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            The principles that guide every decision we make.
          </motion.p>
        </div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {values.map((value, index) => (
            <AccordionItem
              key={value.id}
              value={value}
              isOpen={openId === value.id}
              onToggle={() => toggleItem(value.id)}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AccordionItem({
  value,
  isOpen,
  onToggle,
  index,
}: {
  value: (typeof values)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Background gradient when open - warm amber tones */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent -z-10"
          />
        )}
      </AnimatePresence>

      <div
        className={`relative rounded-2xl border transition-all duration-300 ${
          isOpen
            ? "border-primary/30 bg-card/60 backdrop-blur-sm"
            : "border-border/20 bg-card/30 hover:border-border/30 hover:bg-card/40"
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-4 p-6 text-left cursor-pointer group"
        >
          {/* Icon - all use warm primary color */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 bg-primary/10 border-primary/20 text-primary ${
              isOpen ? "scale-110" : "group-hover:scale-105"
            }`}
          >
            {value.icon}
          </div>

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{value.title}</h3>
            <p className="text-sm text-muted-foreground">{value.subtitle}</p>
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 text-muted-foreground"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>

        {/* Content - Expandable */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.3 },
              }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6">
                {/* Divider */}
                <div className="h-px bg-primary/10 mb-4" />

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed pl-16">
                  {value.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
