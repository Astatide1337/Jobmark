'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coffee,
  FileText,
  Flame,
  Folder,
  Link2,
  Network,
  Pencil,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { JobmarkMark } from '@/components/brand/jobmark-mark';
import { useMotionPreference } from './use-motion-preference';

const navigation = [
  { id: 'capture', label: 'Capture', icon: Pencil },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'reviews', label: 'Reviews', icon: FileText },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'focus', label: 'Focus', icon: Coffee },
  { id: 'network', label: 'Network', icon: Users },
  { id: 'connect', label: 'Connect AI', icon: Link2 },
  { id: 'guides', label: 'Guides', icon: BookOpen },
] as const;

type PreviewView = (typeof navigation)[number]['id'];

export function DashboardPreview() {
  const [activeView, setActiveView] = useState<PreviewView>('capture');
  const prefersReducedMotion = useMotionPreference();

  return (
    <div className="border-border/50 bg-card/90 relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/25">
      <div className="grid min-h-[540px] grid-cols-[92px_1fr] sm:min-h-[580px] sm:grid-cols-[180px_1fr] lg:min-h-[620px] lg:grid-cols-[200px_1fr]">
        <aside className="border-border/50 bg-sidebar/70 flex flex-col border-r p-3 sm:p-5">
          <div className="mb-7 flex items-center justify-center gap-3 sm:justify-start">
            <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl">
              <JobmarkMark className="h-5 w-5" sizes="20px" />
            </div>
            <span className="text-foreground hidden font-serif text-lg font-semibold sm:inline">
              Jobmark
            </span>
          </div>

          <nav aria-label="Interactive product preview" className="space-y-1">
            {navigation.map(({ id, label, icon: Icon }) => {
              const active = activeView === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => setActiveView(id)}
                  whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  transition={{ duration: 0.18 }}
                  className={
                    active
                      ? 'text-foreground focus-visible:ring-ring/50 relative flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none sm:justify-start'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-ring/50 flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[color,background-color] focus-visible:ring-2 focus-visible:outline-none sm:justify-start'
                  }
                >
                  {active ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId="preview-active-nav"
                      className="bg-sidebar-accent absolute inset-0 rounded-xl"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" />
                  <span aria-hidden="true" className="relative z-10 hidden truncate sm:inline">
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </nav>

          <div className="border-sidebar-border/60 mt-auto border-t pt-4">
            <div className="text-sidebar-foreground/70 flex items-center justify-center gap-3 px-3 py-2.5 text-sm sm:justify-start">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-border/50 flex items-center justify-between border-b px-4 py-4 sm:px-7">
            <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs whitespace-nowrap sm:text-sm">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>Monday, August 17</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
              <span className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                DU
              </span>
              <span className="hidden sm:inline">Demo User</span>
            </div>
          </header>

          <div className="relative min-h-[472px] overflow-hidden sm:min-h-[512px] lg:min-h-[552px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.main
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 p-4 sm:p-7"
              >
                <PreviewPanel
                  view={activeView}
                  prefersReducedMotion={prefersReducedMotion === true}
                />
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-foreground text-xl font-semibold sm:text-3xl">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm sm:text-base">{children}</p>
    </div>
  );
}

function PreviewPanel({
  view,
  prefersReducedMotion,
}: {
  view: PreviewView;
  prefersReducedMotion: boolean;
}) {
  if (view === 'capture') return <CapturePanel prefersReducedMotion={prefersReducedMotion} />;
  if (view === 'projects') return <ProjectsPanel />;
  if (view === 'reviews') return <ReviewsPanel />;
  if (view === 'insights') return <InsightsPanel />;
  if (view === 'focus') return <FocusPanel prefersReducedMotion={prefersReducedMotion} />;
  if (view === 'network') return <NetworkPanel />;
  if (view === 'connect') return <ConnectPanel />;
  return <GuidesPanel />;
}

function CapturePanel({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <Heading title="Good morning.">Save a clear note while the work is still fresh.</Heading>
      <section className="border-border/60 bg-background/40 rounded-2xl border p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              Capture to record
            </p>
            <p className="text-muted-foreground mt-1 text-xs">What changed today?</p>
          </div>
          <span className="text-primary flex shrink-0 items-center gap-1.5 text-xs">
            <span className="bg-success h-1.5 w-1.5 animate-pulse rounded-full motion-reduce:animate-none" />
            Today
          </span>
        </div>
        <p className="text-foreground text-base leading-relaxed sm:text-lg">
          Finished the quarterly review and walked the team through the key decisions.
        </p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium">
            Q4 Planning
          </span>
          <motion.button
            type="button"
            onClick={() => setSaved(true)}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-[background-color,box-shadow] hover:shadow-lg hover:shadow-black/15 focus-visible:ring-2 focus-visible:outline-none"
          >
            {saved ? <CheckCircle2 className="h-4 w-4" /> : null}
            {saved ? 'Saved' : 'Save entry'}
          </motion.button>
        </div>
      </section>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Activities', value: '42', note: 'this month', icon: FileText },
          { label: 'Days with notes', value: '18', note: 'this month', icon: Flame },
          { label: 'Projects', value: '5', note: 'active', icon: Folder },
        ].map(({ label, value, note, icon: Icon }) => (
          <div
            key={label}
            className="border-border/50 bg-card/60 hover:border-primary/30 rounded-xl border p-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[10px] uppercase sm:text-xs">{label}</p>
              <Icon className="text-muted-foreground/70 h-3.5 w-3.5" />
            </div>
            <p className="text-foreground mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
            <p className="text-muted-foreground mt-1 text-[10px] sm:text-xs">{note}</p>
          </div>
        ))}
      </div>
      <div className="border-border/50 bg-primary/5 mt-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
        <div className="min-w-0">
          <p className="text-primary text-[10px] font-semibold tracking-wide uppercase">Next up</p>
          <p className="text-foreground mt-1 text-sm font-medium">Draft your weekly update.</p>
        </div>
        <span className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium">
          Open draft <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function ProjectsPanel() {
  return (
    <div>
      <Heading title="Projects">Keep related work together.</Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['Website redesign', '24 notes', '68%'],
          ['Mobile app MVP', '12 notes', '42%'],
          ['Q4 planning', '6 notes', '81%'],
          ['Hiring plan', '8 notes', '55%'],
        ].map(([name, notes, progress]) => (
          <div key={name} className="border-border/50 bg-background/40 rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <span className="bg-primary/15 flex h-9 w-9 items-center justify-center rounded-xl">
                <Folder className="text-primary h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-muted-foreground text-xs">{notes}</p>
              </div>
            </div>
            <div className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: progress }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsPanel() {
  return (
    <div>
      <Heading title="Review drafts">Turn saved evidence into something useful.</Heading>
      <div className="border-border/50 bg-background/40 rounded-2xl border p-5">
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Quarterly review
        </p>
        <h3 className="mt-2 text-lg font-semibold">Q4 impact summary</h3>
        <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
          {[
            'Shipped the checkout redesign ahead of schedule.',
            'Reduced payment failures by 40%.',
            'Mentored two engineers through onboarding.',
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <span className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium">
            Open draft
          </span>
          <span className="border-border rounded-lg border px-3 py-2 text-xs">Export</span>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel() {
  return (
    <div>
      <Heading title="Insights">See the rhythm behind your work.</Heading>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="border-border/50 bg-background/40 rounded-2xl border p-4">
          <p className="text-muted-foreground text-xs uppercase">Notes this week</p>
          <div className="mt-5 flex h-28 items-end gap-2">
            {[36, 56, 42, 74, 58, 82, 64].map((height, index) => (
              <div
                key={index}
                className="bg-primary/15 flex h-full flex-1 items-end overflow-hidden rounded-t-md"
              >
                <div className="bg-primary w-full rounded-t-md" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="border-border/50 bg-primary/5 rounded-2xl border p-4">
          <Sparkles className="text-primary h-5 w-5" />
          <p className="mt-4 text-3xl font-semibold">18</p>
          <p className="text-muted-foreground text-sm">active days this month</p>
          <p className="text-primary mt-5 text-xs font-medium">6 day streak</p>
        </div>
      </div>
    </div>
  );
}

function FocusPanel({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <Heading title="Focus">Reset before the next thing.</Heading>
      <div className="border-border/50 bg-primary/5 flex flex-1 flex-col items-center justify-center rounded-2xl border text-center">
        <motion.div
          animate={
            prefersReducedMotion ? undefined : { scale: [0.9, 1.04, 0.9], opacity: [0.78, 1, 0.78] }
          }
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="border-primary/30 bg-primary/10 shadow-primary/10 flex h-32 w-32 items-center justify-center rounded-full border shadow-[0_0_60px] sm:h-40 sm:w-40"
        >
          <span className="text-primary font-serif text-2xl tracking-[0.12em] sm:text-3xl">
            INHALE
          </span>
        </motion.div>
        <p className="text-muted-foreground mt-5 text-sm">A short reset before the next thing.</p>
      </div>
    </div>
  );
}

function NetworkPanel() {
  return (
    <div>
      <Heading title="Network">Remember the context, not just the contact.</Heading>
      <div className="space-y-3">
        {[
          ['Maya Chen', 'Product design', 'Follow up Thursday'],
          ['Daniel Ross', 'Engineering lead', 'Last spoke 8 days ago'],
          ['Ari Singh', 'Former teammate', 'Share launch update'],
        ].map(([name, role, note]) => (
          <div
            key={name}
            className="border-border/50 bg-background/40 flex items-center gap-3 rounded-xl border p-4"
          >
            <span className="bg-primary/15 text-primary flex h-10 w-10 items-center justify-center rounded-full font-semibold">
              {name
                .split(' ')
                .map(part => part[0])
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-muted-foreground text-xs">{role}</p>
            </div>
            <span className="text-muted-foreground hidden text-xs sm:block">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectPanel() {
  return (
    <div>
      <Heading title="Connect AI">Bring your record to the assistant you choose.</Heading>
      <div className="border-border/50 bg-background/40 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <span className="bg-primary/15 flex h-11 w-11 items-center justify-center rounded-xl">
            <Network className="text-primary h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">MCP connection</p>
            <p className="text-muted-foreground text-sm">
              Your evidence stays structured in Jobmark.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {['ChatGPT', 'Claude', 'Gemini'].map(name => (
            <div
              key={name}
              className="border-border/50 bg-card rounded-xl border px-3 py-4 text-center text-xs font-medium"
            >
              {name}
            </div>
          ))}
        </div>
        <div className="bg-success/10 text-success mt-5 inline-flex rounded-full px-3 py-1 text-xs font-medium">
          Ready to connect
        </div>
      </div>
    </div>
  );
}

function GuidesPanel() {
  return (
    <div>
      <Heading title="Guides">Small prompts for the moments that matter.</Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['Prepare for a performance review', '7 min'],
          ['Write a useful weekly update', '5 min'],
          ['Capture impact without overselling', '6 min'],
          ['Turn project notes into a story', '8 min'],
        ].map(([title, time]) => (
          <div key={title} className="border-border/50 bg-background/40 rounded-2xl border p-4">
            <BookOpen className="text-primary h-5 w-5" />
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="text-muted-foreground mt-1 text-xs">{time} read</p>
          </div>
        ))}
      </div>
    </div>
  );
}
