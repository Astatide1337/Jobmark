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
    label: 'Track Your Wins',
    icon: <Trophy className="h-4 w-4" />,
    headline: 'Capture every accomplishment',
    description:
      "Log your work in 30 seconds. Build a comprehensive timeline of everything you've achieved, so nothing slips through the cracks.",
    features: [
      'Quick daily logging',
      'Smart categorization',
      'Searchable history',
      'Timeline view',
    ],
    visual: <TrackVisual />,
  },
  {
    id: 'prove',
    label: 'Prove Your Impact',
    icon: <TrendingUp className="h-4 w-4" />,
    headline: 'Turn logs into proof',
    description:
      "When it's time for performance reviews or promotion discussions, generate compelling reports that showcase your contributions with specific examples.",
    features: [
      'AI-generated summaries',
      'Impact highlights',
      'Metric extraction',
      'Custom report templates',
    ],
    visual: <ProveVisual />,
  },
  {
    id: 'share',
    label: 'Share Your Progress',
    icon: <Share2 className="h-4 w-4" />,
    headline: 'Keep everyone in the loop',
    description:
      'Create polished updates for standups, team meetings, or stakeholder reports. No more scrambling to remember what you worked on.',
    features: [
      'Weekly summaries',
      'Standup reports',
      'Export to PDF/Markdown',
      'Team-ready formatting',
    ],
    visual: <ShareVisual />,
  },
];

function TrackVisual() {
  return (
    <div className="bg-card/60 border-border/40 space-y-4 rounded-lg border p-6">
      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
        <Calendar className="text-primary h-4 w-4" />
        <span>Today's Entries</span>
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
        <span>Generated Report Preview</span>
      </div>

      <div className="space-y-4">
        <div className="bg-background/50 border-border/20 rounded-lg border p-4">
          <h4 className="mb-2 text-sm font-medium">Key Achievements - Q4</h4>
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
            <div className="text-muted-foreground text-xs">Entries logged</div>
          </div>
          <div className="bg-primary/5 border-primary/20 flex-1 rounded-lg border p-3 text-center">
            <div className="text-primary text-2xl font-bold">12</div>
            <div className="text-muted-foreground text-xs">Features shipped</div>
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
        <span>Weekly Update</span>
      </div>

      <div className="bg-background/50 border-border/20 space-y-3 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>Ready to share with your team</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-foreground font-medium">This Week's Highlights:</p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground leading-relaxed"
          >
            <p>
              Completed the checkout redesign ahead of schedule. Collaborated with design on the new
              dashboard components. Fixed 3 high-priority bugs reported by customers.
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
            Copy to Clipboard
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
              Use Cases
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Built for how you <span className="text-primary">actually work</span>
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
