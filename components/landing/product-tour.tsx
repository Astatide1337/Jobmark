/**
 * Scrollytelling Product Tour
 *
 * Why: High-density feature walkthrough. It uses a "Sticky Viewport"
 * pattern where the user scrolls through 500vh of vertical space to
 * trigger horizontal content and visual transitions.
 *
 * Animation Architecture:
 * - `smoothProgress`: Uses a spring-loaded `scrollYProgress` to ensure
 *   transitions feel liquid and high-end.
 * - Scene Mapping: Maps specific scroll offsets (0.2 increments) to
 *   unique text and visual "Scenes."
 * - Performance: The demo scenes utilize CSS `scale` transforms to
 *   render real dashboard components in a compact preview window.
 */
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, type MotionValue } from 'framer-motion';
import { DemoChat } from './demos/demo-chat';
import { DemoReports } from './demos/demo-reports';
import { DemoInsights } from './demos/demo-insights';

const steps = [
  {
    id: 'capture',
    title: 'Capture in seconds',
    subtitle: 'Not another task list.',
    description:
      "Type what you accomplished. That's it. No categories to choose, no forms to fill out.",
  },
  {
    id: 'timeline',
    title: 'Your timeline builds itself',
    subtitle: 'Organized automatically.',
    description:
      'Every entry lands on your timeline. AI detects projects and themes without manual tagging.',
  },
  {
    id: 'reports',
    title: 'Generate polished reports',
    subtitle: 'From notes to narrative.',
    description:
      'Select a date range and tone. AI transforms your entries into professional reports.',
  },
  {
    id: 'mentor',
    title: 'Chat with AI Mentor',
    subtitle: 'Your career coach, 24/7.',
    description: 'Stuck on a goal? Chat with an AI trained on proven productivity methods.',
  },
  {
    id: 'insights',
    title: 'Discover your patterns',
    subtitle: 'Data-driven self-awareness.',
    description:
      "Streak tracking, heatmaps, project distribution. See when you're most productive.",
  },
];

export function ProductTour() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section ref={containerRef} id="product-tour" className="relative h-[500vh]">
      {/* Sticky viewport */}
      <div className="bg-background sticky top-0 flex h-screen items-center justify-center">
        {/* Subtle background gradient */}
        <div className="from-primary/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-transparent" />

        {/* Main content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left: Text content */}
            <div className="relative">
              {/* Progress indicator */}
              <ProgressBar progress={smoothProgress} />

              {/* Text scenes container */}
              <div className="relative mt-8 h-[280px]">
                {steps.map((step, index) => (
                  <TextScene key={step.id} progress={smoothProgress} index={index} step={step} />
                ))}
              </div>
            </div>

            {/* Right: Demo preview */}
            <div className="relative h-[400px] lg:h-[500px]">
              {/* Ambient glow */}
              <div className="bg-primary/8 absolute -inset-4 rounded-full opacity-60 blur-3xl" />

              {/* Demo container */}
              <div className="border-border/40 bg-card/90 relative h-full w-full overflow-hidden rounded-2xl border shadow-2xl shadow-black/20 backdrop-blur-sm">
                {/* Demo scenes */}
                <DemoScene progress={smoothProgress} index={0}>
                  <QuickCaptureDemo />
                </DemoScene>
                <DemoScene progress={smoothProgress} index={1}>
                  <TimelineDemo />
                </DemoScene>
                <DemoScene progress={smoothProgress} index={2}>
                  <div className="h-full w-full origin-top-left scale-[0.55]">
                    <div className="h-[182%] w-[182%]">
                      <DemoReports />
                    </div>
                  </div>
                </DemoScene>
                <DemoScene progress={smoothProgress} index={3}>
                  <div className="h-full w-full origin-top-left scale-[0.55]">
                    <div className="h-[182%] w-[182%]">
                      <DemoChat />
                    </div>
                  </div>
                </DemoScene>
                <DemoScene progress={smoothProgress} index={4}>
                  <div className="h-full w-full origin-top-left scale-[0.55]">
                    <div className="h-[182%] w-[182%]">
                      <DemoInsights />
                    </div>
                  </div>
                </DemoScene>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Progress bar with step counter
function ProgressBar({ progress }: { progress: MotionValue<number> }) {
  const width = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <div className="flex items-center gap-4">
      <div className="bg-muted/50 h-[3px] flex-1 overflow-hidden rounded-full">
        <motion.div
          className="from-primary to-primary/80 h-full rounded-full bg-gradient-to-r"
          style={{ width }}
        />
      </div>
      <StepCounter progress={progress} />
    </div>
  );
}

function StepCounter({ progress }: { progress: MotionValue<number> }) {
  const step1 = useTransform(progress, [0, 0.18, 0.22], [1, 1, 0]);
  const step2 = useTransform(progress, [0.18, 0.22, 0.38, 0.42], [0, 1, 1, 0]);
  const step3 = useTransform(progress, [0.38, 0.42, 0.58, 0.62], [0, 1, 1, 0]);
  const step4 = useTransform(progress, [0.58, 0.62, 0.78, 0.82], [0, 1, 1, 0]);
  const step5 = useTransform(progress, [0.78, 0.82, 1], [0, 1, 1]);

  return (
    <div className="text-muted-foreground relative mb-5 w-15 font-mono text-sm tabular-nums">
      <motion.span className="absolute inset-0" style={{ opacity: step1 }}>
        01 / 05
      </motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step2 }}>
        02 / 05
      </motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step3 }}>
        03 / 05
      </motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step4 }}>
        04 / 05
      </motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step5 }}>
        05 / 05
      </motion.span>
    </div>
  );
}

// Text scene with crossfade
function TextScene({
  progress,
  index,
  step,
}: {
  progress: MotionValue<number>;
  index: number;
  step: (typeof steps)[0];
}) {
  const start = index * 0.2;
  const end = (index + 1) * 0.2;

  const opacity = useTransform(progress, [start, start + 0.05, end, end + 0.05], [0, 1, 1, 0]);

  const y = useTransform(progress, [start, start + 0.05, end, end + 0.05], [40, 0, 0, -40]);

  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center" style={{ opacity, y }}>
      <p className="text-primary mb-3 text-sm font-medium tracking-wide uppercase">
        {step.subtitle}
      </p>
      <h2 className="mb-4 font-serif text-3xl leading-[1.1] font-bold sm:text-4xl lg:text-5xl">
        {step.title}
      </h2>
      <p className="text-muted-foreground max-w-lg text-base leading-relaxed lg:text-lg">
        {step.description}
      </p>
    </motion.div>
  );
}

// Demo scene with crossfade
function DemoScene({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: React.ReactNode;
}) {
  const start = index * 0.2;
  const end = (index + 1) * 0.2;

  const opacity = useTransform(progress, [start, start + 0.05, end, end + 0.05], [0, 1, 1, 0]);

  const scale = useTransform(progress, [start, start + 0.05, end, end + 0.05], [0.96, 1, 1, 0.96]);

  return (
    <motion.div className="absolute inset-0" style={{ opacity, scale }}>
      {children}
    </motion.div>
  );
}

// Quick Capture Demo
function QuickCaptureDemo() {
  return (
    <div className="from-card to-card/50 flex h-full flex-col items-center justify-center bg-gradient-to-b p-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
            Quick Capture
          </div>
          <p className="text-muted-foreground text-sm">What did you accomplish?</p>
        </div>

        {/* Input area */}
        <div className="border-primary/30 bg-background/80 rounded-xl border p-4 backdrop-blur-sm">
          <p className="text-sm leading-relaxed">
            Completed the quarterly report and presented findings to the team. Received positive
            feedback on the data visualizations.
          </p>
          <span className="bg-primary ml-0.5 inline-block h-4 w-0.5 animate-pulse" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="bg-primary/15 text-primary rounded-full px-3 py-1.5 text-xs font-medium">
            Q4 Planning
          </span>
          <button className="bg-primary text-primary-foreground shadow-primary/20 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Timeline Demo
function TimelineDemo() {
  const entries = [
    { text: 'Reviewed pull request for auth module', project: 'Mobile App', time: '2h ago' },
    { text: 'Completed quarterly report presentation', project: 'Q4 Planning', time: 'Yesterday' },
    {
      text: 'Synced with design team on new layouts',
      project: 'Website Redesign',
      time: 'Yesterday',
    },
  ];

  return (
    <div className="from-card to-card/50 flex h-full flex-col bg-gradient-to-b p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Your Timeline</h3>
        <p className="text-muted-foreground text-sm">This week's accomplishments</p>
      </div>

      {/* Timeline */}
      <div className="relative flex-1">
        <div className="from-primary/50 via-primary/30 absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b to-transparent" />

        <div className="space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className="relative pl-6">
              <div className="border-primary bg-background absolute top-2.5 left-0 h-[14px] w-[14px] rounded-full border-2" />
              <div className="bg-background/60 border-border/30 rounded-lg border p-3">
                <p className="text-sm leading-snug font-medium">{entry.text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-medium">
                    {entry.project}
                  </span>
                  <span className="text-muted-foreground text-xs">{entry.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
