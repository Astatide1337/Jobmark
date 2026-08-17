/**
 * Use-Case Persona Tabs
 *
 * Why: Different users have different goals (Tracking wins vs. Sharing with teams).
 * This component allows users to self-identify with a specific "Problem -> Solution"
 * narrative through interactive tabs.
 *
 * Implementation:
 * - Tabbed Interface: Keeps panels mounted so switching tabs does not replay or flash content.
 * - Visual Mockups: Each tab includes a unique "Visual" sub-component that
 *   simulates a specific feature (e.g., Weekly Highlights, Stats).
 */
'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useMotionPreference } from './use-motion-preference';

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
    label: 'Capture as you go',
    icon: <Trophy className="h-4 w-4" />,
    headline: 'Save the moment and get back to work',
    description: 'Add a short entry, link a project, and move on.',
    features: ['Daily entries', 'One timeline', 'Find by project', 'Simple tags'],
    visual: <TrackVisual />,
  },
  {
    id: 'prove',
    label: 'Prepare for reviews',
    icon: <TrendingUp className="h-4 w-4" />,
    headline: 'Go into reviews with examples',
    description: 'Use the work you logged instead of trying to rebuild the quarter from memory.',
    features: ['Review drafts', 'Promotion notes', 'Show what changed', 'Drafts you can download'],
    visual: <ProveVisual />,
  },
  {
    id: 'share',
    label: 'Write an update',
    icon: <Share2 className="h-4 w-4" />,
    headline: 'Say what happened',
    description: 'Turn a week of work into a clear status update.',
    features: ['Weekly updates', 'Status notes', 'Copy and share', 'One place for your record'],
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
        {
          time: '11:15 AM',
          text: 'Led the sprint planning meeting.',
          tags: ['Leadership', 'Planning'],
        },
        {
          time: '9:45 AM',
          text: 'Reviewed three code changes for the team.',
          tags: ['Code review'],
        },
      ].map((entry, i) => (
        <div
          key={i}
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
        </div>
      ))}
    </div>
  );
}

function ProveVisual() {
  return (
    <div className="bg-card/60 border-border/40 space-y-4 rounded-lg border p-6">
      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
        <Sparkles className="text-primary h-4 w-4" />
        <span>Q4 review draft</span>
      </div>

      <div className="space-y-4">
        <div className="bg-background/50 border-border/20 rounded-lg border p-4">
          <h4 className="mb-2 text-sm font-medium">What changed in Q4</h4>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {[
              'Led migration to new payment system, reducing failures by 40%',
              'Mentored 2 junior developers through onboarding',
              'Shipped 12 features ahead of schedule',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <div className="bg-primary/5 border-primary/20 flex-1 rounded-lg border p-3 text-center">
            <div className="text-primary text-2xl font-bold">47</div>
            <div className="text-muted-foreground text-xs">Notes saved</div>
          </div>
          <div className="bg-primary/5 border-primary/20 flex-1 rounded-lg border p-3 text-center">
            <div className="text-primary text-2xl font-bold">12</div>
            <div className="text-muted-foreground text-xs">Projects</div>
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
          <span>Ready to share</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-foreground font-medium">This week:</p>
          <div className="text-muted-foreground leading-relaxed">
            <p>
              Finished the checkout redesign, worked with design on the new dashboard, and fixed
              three important customer issues.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs"
          >
            Copy update
          </button>
          <button
            type="button"
            className="border-border/40 text-muted-foreground rounded-md border px-3 py-1.5 text-xs"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function PersonaTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const prefersReducedMotion = useMotionPreference();
  const activeTabData = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  const selectTab = (id: string, focus = false) => {
    setActiveTab(id);
    if (focus) {
      const index = tabs.findIndex(tab => tab.id === id);
      tabRefs.current[index]?.focus();
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    selectTab(tabs[nextIndex].id, true);
  };

  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion === true ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{
            duration: prefersReducedMotion === true ? 0 : 0.65,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mb-16 max-w-2xl"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-primary/50 h-px w-12" />
            <span className="text-primary font-mono text-sm tracking-wide uppercase">
              Make your work easier to explain
            </span>
          </div>

          <h2 className="mb-6 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Keep the useful parts while they are clear.
          </h2>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          initial={prefersReducedMotion === true ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: prefersReducedMotion === true ? 0 : 0.5, delay: 0.08 }}
          className="mb-12 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Ways to use Jobmark"
        >
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              ref={element => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`persona-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, index)}
              whileHover={prefersReducedMotion === true ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion === true ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-[color,border-color,box-shadow] duration-300 ${
                activeTab === tab.id
                  ? 'text-primary-foreground border-transparent'
                  : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card border-border/40 border'
              } `}
            >
              {activeTab === tab.id ? (
                <motion.span
                  aria-hidden="true"
                  layoutId="persona-tab-active"
                  className="bg-primary absolute inset-0 rounded-full"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Tab content stays mounted so switching tabs does not blank or reload the section. */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left - Text content */}
          <div className="relative min-h-[280px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeTabData.id}
                id={`persona-panel-${activeTabData.id}`}
                role="tabpanel"
                aria-hidden="false"
                initial={prefersReducedMotion === true ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion === true ? undefined : { opacity: 0, y: -10 }}
                transition={{
                  duration: prefersReducedMotion === true ? 0 : 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute inset-0 space-y-6"
              >
                <h3 className="text-foreground font-serif text-2xl font-semibold sm:text-3xl">
                  {activeTabData.headline}
                </h3>

                <p className="text-muted-foreground text-lg leading-relaxed">
                  {activeTabData.description}
                </p>

                <ul className="space-y-3 pt-2">
                  {activeTabData.features.map((feature, index) => (
                    <motion.li
                      key={feature}
                      initial={prefersReducedMotion === true ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: prefersReducedMotion === true ? 0 : 0.25,
                        delay: prefersReducedMotion === true ? 0 : index * 0.045,
                      }}
                      className="text-muted-foreground flex items-center gap-3"
                    >
                      <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                      {feature}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative min-h-[400px] lg:pl-8">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeTabData.id}
                aria-hidden="false"
                initial={
                  prefersReducedMotion === true ? false : { opacity: 0, y: 16, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  prefersReducedMotion === true ? undefined : { opacity: 0, y: -10, scale: 0.985 }
                }
                transition={{
                  duration: prefersReducedMotion === true ? 0 : 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute inset-0"
              >
                {activeTabData.visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
