/**
 * Use-Case Persona Tabs
 *
 * Why: Different users have different goals (Tracking wins vs. Sharing with teams).
 * This component allows users to self-identify with a specific "Problem -> Solution"
 * narrative through interactive tabs.
 *
 * Implementation:
 * - Tabbed Interface: Uses Framer Motion for high-fidelity tab transitions.
 * - Visual Mockups: Each tab includes a unique "Visual" sub-component that
 *   simulates a specific feature (e.g., Weekly Highlights, Stats).
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  Share2,
  CheckCircle2,
  Calendar,
  FileText,
  Users,
  Sparkles,
  Clock,
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  headline: string;
  description: string;
  features: string[];
  visual: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'track',
    label: 'Record the work',
    icon: <Trophy className="h-4 w-4" />,
    headline: 'Write it down while you still remember',
    description:
      'A quick note is enough. Add a project and a few useful details, then move on with your day.',
    features: [
      'Quick daily notes',
      'One timeline for your work',
      'Find anything by project',
      'Tags that stay lightweight',
    ],
    visual: <TrackVisual />,
  },
  {
    id: 'prove',
    label: 'Prepare for reviews',
    icon: <TrendingUp className="h-4 w-4" />,
    headline: 'Walk into reviews with something concrete',
    description:
      'Pull together the work behind a quarter or a promotion conversation without reconstructing it from memory.',
    features: [
      'Review summaries',
      'Promotion evidence',
      'Highlights by impact',
      'Exportable drafts',
    ],
    visual: <ProveVisual />,
  },
  {
    id: 'share',
    label: 'Share an update',
    icon: <Share2 className="h-4 w-4" />,
    headline: 'Say what happened without starting from scratch',
    description:
      'Use the notes you already have to write a clear weekly update, standup note, or status message.',
    features: ['Weekly updates', 'Standup notes', 'Copy and share', 'A consistent record'],
    visual: <ShareVisual />,
  },
];

function TrackVisual() {
  return (
    <div className="bg-card/60 border-border/40 space-y-4 rounded-lg border p-6">
      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
        <Calendar className="text-primary h-4 w-4" />
        <span>Recent notes</span>
      </div>

      {[
        {
          time: '2:34 PM',
          text: 'Fixed critical bug in payment flow',
          tags: ['bug-fix', 'payments'],
        },
        { time: '11:15 AM', text: 'Led sprint planning meeting', tags: ['leadership', 'planning'] },
        { time: '9:45 AM', text: 'Reviewed 3 PRs from team', tags: ['code-review'] },
      ].map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-background/50 border-border/20 flex items-start gap-3 rounded-lg border p-3"
        >
          <Clock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{entry.time}</span>
            </div>
            <p className="text-foreground text-sm">{entry.text}</p>
            <div className="mt-2 flex gap-1.5">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProveVisual() {
  return (
    <div className="bg-card/60 border-border/40 space-y-4 rounded-lg border p-6">
      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
        <Sparkles className="text-primary h-4 w-4" />
        <span>Draft for Q4</span>
      </div>

      <div className="space-y-4">
        <div className="bg-background/50 border-border/20 rounded-lg border p-4">
          <h4 className="mb-2 text-sm font-medium">What moved forward in Q4</h4>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {[
              'Led migration to new payment system, reducing failures by 40%',
              'Mentored 2 junior developers through onboarding',
              'Shipped 12 features ahead of schedule',
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-start gap-2"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <div className="bg-primary/5 border-primary/20 flex-1 rounded-lg border p-3 text-center">
            <div className="text-primary text-2xl font-bold">47</div>
            <div className="text-muted-foreground text-xs">Notes recorded</div>
          </div>
          <div className="bg-primary/5 border-primary/20 flex-1 rounded-lg border p-3 text-center">
            <div className="text-primary text-2xl font-bold">12</div>
            <div className="text-muted-foreground text-xs">Projects touched</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="bg-card/60 border-border/40 space-y-4 rounded-lg border p-6">
      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
        <FileText className="text-primary h-4 w-4" />
        <span>Weekly update</span>
      </div>

      <div className="bg-background/50 border-border/20 space-y-3 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>Ready to share with your team</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-foreground font-medium">This week:</p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground leading-relaxed"
          >
            <p>
              Finished the checkout redesign, worked with design on the new dashboard, and fixed
              three high-priority customer issues.
            </p>
          </motion.div>
        </div>

        <div className="flex gap-2 pt-2">
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs"
          >
            Copy update
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="border-border/40 text-muted-foreground rounded-md border px-3 py-1.5 text-xs"
          >
            Export PDF
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function PersonaTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const activeTabData = tabs.find(t => t.id === activeTab)!;

  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center gap-3"
          >
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">
              A better work habit
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Keep the details. <span className="text-primary">Skip the scramble.</span>
          </motion.h2>
        </div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 flex flex-wrap gap-2"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card border-border/40 border'
              } `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
          >
            {/* Left - Text content */}
            <div className="space-y-6">
              <h3 className="text-foreground font-serif text-2xl font-semibold sm:text-3xl">
                {activeTabData.headline}
              </h3>

              <p className="text-muted-foreground text-lg leading-relaxed">
                {activeTabData.description}
              </p>

              <ul className="space-y-3 pt-2">
                {activeTabData.features.map((feature, i) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-muted-foreground flex items-center gap-3"
                  >
                    <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right - Visual */}
            <div className="lg:pl-8">{activeTabData.visual}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
