/**
 * Interactive Dashboard Demo
 *
 * Why: The hero should communicate the real Jobmark workflow, not a static
 * dashboard illustration. Each sidebar selection swaps to a local preview of
 * the corresponding authenticated workspace without touching user data.
 */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  FolderOpen,
  History,
  Newspaper,
  Plus,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { QuickCapture } from '@/app/dashboard/dashboard-client';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReportHistory } from '@/components/reports/report-history';
import { InsightsSummary } from '@/components/insights/insights-summary';
import { ActivityCharts } from '@/components/insights/activity-charts';
import { BreathingDisplay } from '@/components/focus/breathing-display';
import { BREATHING_PATTERNS } from '@/lib/focus/defaults';
import type { BreathingPattern } from '@/lib/focus/types';
import type { InsightsData } from '@/app/actions/insights';
import { DashboardFrame } from './dashboard-frame';
import { DemoMcpConnectorContent } from './demo-chat';

const DEMO_REPORTS = [
  {
    id: 'demo-weekly-update',
    title: 'Weekly Engineering Update',
    content:
      '## Summary\nShipped the dashboard polish and clarified the API scope.\n\n### Key Wins\n- Reviewed two pull requests\n- Resolved the payment-flow edge case\n- Aligned the next sprint with the team\n\n### Next Steps\n- Share the update with the manager\n- Use the next milestone as the starting point for a review draft',
    createdAt: new Date('2026-08-12T16:00:00.000Z'),
  },
  {
    id: 'demo-goals-review',
    title: 'Q1 Goals Review',
    content:
      '## Overview\nThe record shows steady progress toward the product launch.\n\n### Progress\n- Backend auth: complete\n- Database schema: finalized\n- Frontend polish: in progress',
    createdAt: new Date('2026-08-10T13:30:00.000Z'),
  },
];

const DEMO_INSIGHTS: InsightsData = {
  totalActivities: 42,
  totalReports: 2,
  activeDaysThisMonth: 18,
  currentStreak: 6,
  longestStreak: 12,
  bestDay: { date: '2026-08-12', count: 8 },
  heatmapData: [],
  heatmapGrid: [],
  monthLabels: [],
  weeklyTrend: [8, 12, 10, 16, 14, 18, 20, 17],
  projectDistribution: [
    { name: 'Website Redesign', count: 24, color: '#d4a574' },
    { name: 'Mobile App MVP', count: 12, color: '#7fb069' },
    { name: 'Q1 Hiring Strategy', count: 6, color: '#e0a458' },
  ],
};

const DEMO_PROJECTS = [
  { name: 'Website Redesign', detail: '24 activities', color: '#d4a574' },
  { name: 'Mobile App MVP', detail: '12 activities', color: '#7fb069' },
  { name: 'Q1 Hiring Strategy', detail: '6 activities', color: '#e0a458' },
];

export function DemoDashboard() {
  return (
    <DashboardFrame activePath="/dashboard" compact>
      {activePath => <DemoWorkspace activePath={activePath} />}
    </DashboardFrame>
  );
}

function DemoWorkspace({ activePath }: { activePath: string }) {
  const [goalAdded, setGoalAdded] = useState(false);

  if (activePath === '/dashboard') {
    return <DemoOverview goalAdded={goalAdded} onAddGoal={() => setGoalAdded(true)} />;
  }

  if (activePath === '/projects') return <DemoProjectsView />;
  if (activePath === '/reports') return <DemoReportsView />;
  if (activePath === '/insights') return <DemoInsightsView />;
  if (activePath === '/focus') return <DemoFocusView />;
  if (activePath === '/chat') return <DemoMcpConnectorContent />;

  return <DemoModuleView path={activePath} />;
}

function DemoOverview({ goalAdded, onAddGoal }: { goalAdded: boolean; onAddGoal: () => void }) {
  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Good morning.</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Write down what you did while it is fresh.
        </p>
      </div>

      <Card className="border-border/50 bg-card/60 rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center space-y-3 py-7 text-center">
          <div className="bg-primary/10 rounded-full p-3">
            {goalAdded ? (
              <Check className="text-primary h-6 w-6" />
            ) : (
              <Sparkles className="text-primary h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {goalAdded ? 'Your next goal' : 'Nothing on the horizon yet'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {goalAdded
                ? 'Finish the review draft before Friday.'
                : 'Add one when you want a clear next step.'}
            </p>
          </div>
          {!goalAdded && (
            <Button variant="outline" size="sm" onClick={onAddGoal}>
              <Plus className="mr-2 h-4 w-4" />
              Add a goal
            </Button>
          )}
        </CardContent>
      </Card>

      <QuickCapture demoMode projects={[]} todayCount={1} dailyGoal={3} />

      <StatsCards
        thisMonth={42}
        dates={['2026-08-14T12:00:00.000Z', '2026-08-13T12:00:00.000Z', '2026-08-12T12:00:00.000Z']}
        projects={5}
        monthlyGoal={50}
        summaries={2}
        serverDate="2026-08-14T12:00:00.000Z"
      />

      <div className="border-border/40 bg-card/40 rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">Recent notes</h2>
          <span className="text-muted-foreground text-xs">3 notes this week</span>
        </div>
        <div className="space-y-2">
          {['Reviewed two pull requests', 'Presented the quarterly findings'].map(activity => (
            <div key={activity} className="flex items-center gap-3">
              <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="text-foreground/80 text-xs">{activity}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DemoProjectsView() {
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [created, setCreated] = useState(false);

  return (
    <DemoViewTransition>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Keep related work together.</p>
          </div>
          <Button size="sm" onClick={() => setCreated(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>

        <div className="border-border/50 bg-muted/20 inline-flex rounded-xl border p-1">
          {(['active', 'archived'] as const).map(value => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {value === 'active' ? 'Active Projects' : 'Archived'}
            </button>
          ))}
        </div>

        {created && filter === 'active' && (
          <div className="border-primary/30 bg-primary/[0.06] rounded-xl border p-3">
            <p className="text-foreground text-sm font-medium">New project created</p>
            <p className="text-muted-foreground mt-1 text-xs">
              The next activity can now stay attached to its workstream.
            </p>
          </div>
        )}

        {filter === 'active' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_PROJECTS.map(project => (
              <div
                key={project.name}
                className="border-border/50 bg-card/50 rounded-2xl border p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-xl"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-semibold">{project.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{project.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-primary mt-4 text-xs font-medium hover:underline"
                >
                  View timeline <ArrowRight className="ml-1 inline h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-border/50 bg-card/40 rounded-2xl border border-dashed p-8 text-center">
            <FolderOpen className="text-muted-foreground mx-auto mb-3 h-6 w-6" />
            <p className="text-foreground text-sm font-medium">No archived projects</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Archived workstreams will appear here.
            </p>
          </div>
        )}
      </div>
    </DemoViewTransition>
  );
}

function DemoReportsView() {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [generated, setGenerated] = useState(false);

  return (
    <DemoViewTransition>
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="border-border/50 bg-muted/20 grid w-full max-w-md grid-cols-2 rounded-xl border p-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'new'}
              onClick={() => setTab('new')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'new' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              New review
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              onClick={() => setTab('history')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Saved drafts
            </button>
          </div>
        </div>

        {tab === 'history' ? (
          <ReportHistory
            initialReports={DEMO_REPORTS}
            onUpdate={async () => {}}
            onDelete={async () => {}}
            displayTimeZone="UTC"
          />
        ) : (
          <div className="border-border/50 bg-card/50 rounded-2xl border p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-primary text-[10px] font-semibold tracking-[0.18em] uppercase">
                  New review
                </p>
                <h2 className="text-foreground mt-1 text-lg font-semibold">
                  Build a clear update from recent work.
                </h2>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Choose the evidence window and writing style. Jobmark does the organizing first.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ['1', 'Time window', 'Last 7 days'],
                ['2', 'Projects', 'All active work'],
                ['3', 'Tone', 'Professional'],
              ].map(([step, label, value]) => (
                <div key={step} className="border-border/40 bg-background/40 rounded-xl border p-3">
                  <p className="text-primary text-[10px] font-semibold">
                    {step} · {label}
                  </p>
                  <p className="text-foreground mt-2 text-xs font-medium">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-[11px]">42 activities are ready to shape.</p>
              <Button size="sm" onClick={() => setGenerated(true)}>
                {generated ? 'Draft ready' : 'Create review draft'}
                {generated ? (
                  <Check className="ml-2 h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {generated && (
              <div className="border-primary/20 bg-primary/[0.06] mt-4 rounded-xl border p-3">
                <p className="text-foreground text-xs font-medium">
                  Your evidence is ready for review.
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Open Saved drafts to edit, export, or send to an AI app.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DemoViewTransition>
  );
}

function DemoInsightsView() {
  return (
    <DemoViewTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground mt-1 text-sm">See where your work is going.</p>
        </div>
        <InsightsSummary data={DEMO_INSIGHTS} compact />
        <ActivityCharts
          weeklyTrend={DEMO_INSIGHTS.weeklyTrend}
          projectDistribution={DEMO_INSIGHTS.projectDistribution}
          compact
        />
      </div>
    </DemoViewTransition>
  );
}

function DemoFocusView() {
  const pattern: BreathingPattern = 'box';
  const steps = BREATHING_PATTERNS[pattern].steps;
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const phaseKey = `${pattern}-${stepIndex}`;
  const [previousPhaseKey, setPreviousPhaseKey] = useState(phaseKey);

  if (phaseKey !== previousPhaseKey) {
    setPreviousPhaseKey(phaseKey);
    setVisible(true);
  }

  useEffect(() => {
    const fadeOut = window.setTimeout(
      () => setVisible(false),
      Math.max(0, (steps[stepIndex].duration - 0.8) * 1000)
    );
    const timer = window.setTimeout(
      () => setStepIndex(index => (index + 1) % steps.length),
      steps[stepIndex].duration * 1000
    );
    return () => {
      window.clearTimeout(fadeOut);
      window.clearTimeout(timer);
    };
  }, [stepIndex, steps]);

  return (
    <DemoViewTransition>
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col items-center space-y-4 text-center">
        <div className="flex min-h-[120px] w-full flex-col items-center">
          <p className="text-primary text-[10px] font-semibold tracking-[0.18em] uppercase">
            Focus
          </p>
          <h1 className="mt-1 min-h-[3.5rem] max-w-[17rem] text-2xl leading-7 font-bold tracking-tight">
            Reset before the next thing.
          </h1>
          <p className="text-muted-foreground mt-1 min-h-10 max-w-[19rem] text-sm">
            A short breathing block to slow down and choose what matters next.
          </p>
        </div>
        <div className="border-border/50 bg-card/50 flex h-[252px] min-h-[252px] w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border px-4 py-6">
          <BreathingDisplay
            pattern={pattern}
            stepIndex={stepIndex}
            cycleIndex={0}
            totalCycles={4}
            size="compact"
            visible={visible}
          />
        </div>
      </div>
    </DemoViewTransition>
  );
}

function DemoModuleView({ path }: { path: string }) {
  const definitions: Record<
    string,
    {
      eyebrow: string;
      title: string;
      description: string;
      icon: LucideIcon;
      rows: Array<[string, string, string]>;
    }
  > = {
    '/network': {
      eyebrow: 'Network',
      title: 'Keep relationships warm.',
      description: 'Carry useful context into thoughtful follow-ups without starting from zero.',
      icon: Users,
      rows: [
        ['Maya Chen', 'Follow up', 'Last spoke 8 days ago'],
        ['Alex Rivera', '2 notes', 'Shared work history'],
        ['Jordan Lee', 'Draft ready', 'Based on recent wins'],
      ],
    },
    '/articles': {
      eyebrow: 'Articles',
      title: 'Small habits compound into proof.',
      description: 'Short field notes for capturing work, reflecting well, and staying ready.',
      icon: Newspaper,
      rows: [
        ['Build a work record', '5 min', 'Start here'],
        ['Write better weekly updates', '7 min', 'Practical guide'],
        ['Make reviews easier', '6 min', 'Evidence first'],
      ],
    },
    '/settings': {
      eyebrow: 'Settings',
      title: 'Keep the system aligned with your work.',
      description:
        'Choose your defaults, connected apps, and the way Jobmark supports your rhythm.',
      icon: Settings,
      rows: [
        ['Goals', 'Configured', 'Keep the next move visible'],
        ['Focus', 'Box breathing', 'A short reset before review work'],
        ['Reviews', 'Professional', 'Default writing tone'],
      ],
    },
  };

  const definition = definitions[path] ?? {
    eyebrow: 'Jobmark',
    title: 'Keep your record moving.',
    description: 'Write it down while it is still fresh.',
    icon: BarChart3,
    rows: [],
  };
  const Icon = definition.icon;

  return (
    <DemoViewTransition>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-primary text-[10px] font-semibold tracking-[0.18em] uppercase">
              {definition.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{definition.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {definition.description}
            </p>
          </div>
        </div>

        <div className="border-border/50 bg-card/50 overflow-hidden rounded-2xl border">
          {definition.rows.map(([label, value, detail], index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${index > 0 ? 'border-border/40 border-t' : ''}`}
            >
              <div className="min-w-0">
                <p className="text-foreground/90 truncate text-sm font-medium">{label}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">{detail}</p>
              </div>
              <span className="text-primary shrink-0 text-xs font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </DemoViewTransition>
  );
}

function DemoViewTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="w-full min-w-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
