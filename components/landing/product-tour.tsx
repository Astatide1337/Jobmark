/**
 * Scroll-led product storytelling with one active product preview mounted at a
 * time. The layout follows the original Jobmark tour, while the active-only
 * panel keeps the landing page from running every dashboard demo at once.
 */
'use client';

import { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { DemoMcpConnector } from './demos/demo-mcp-connector';
import { DemoReports } from './demos/demo-reports';
import { DemoInsights } from './demos/demo-insights';
import { useMotionPreference } from './use-motion-preference';

const steps = [
  {
    id: 'capture',
    title: 'Capture the moment',
    subtitle: 'Save it while it is fresh.',
    description: 'Record what you shipped, fixed, or learned.',
  },
  {
    id: 'timeline',
    title: 'Give it a home',
    subtitle: 'Add a project.',
    description: 'Keep related entries together so the story is easy to follow.',
  },
  {
    id: 'reports',
    title: 'Build a review draft',
    subtitle: 'Start with what you logged.',
    description: 'Turn a group of entries into a review or weekly update.',
  },
  {
    id: 'assistant',
    title: 'Bring your own assistant',
    subtitle: 'Get help when you want it.',
    description: 'Connect Claude, ChatGPT, or Gemini to help edit a draft.',
  },
  {
    id: 'insights',
    title: 'Spot the pattern',
    subtitle: 'See what keeps moving.',
    description: 'See which projects and days show up most in your work.',
  },
] as const;

export function ProductTour() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const activeStepRef = useRef(0);
  const prefersReducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const progress = prefersReducedMotion === true ? scrollYProgress : smoothProgress;

  useMotionValueEvent(progress, 'change', latest => {
    const nextStep = Math.min(steps.length - 1, Math.floor(latest * steps.length));
    if (nextStep === activeStepRef.current) return;
    activeStepRef.current = nextStep;
    setActiveStep(nextStep);
  });

  return (
    <section ref={containerRef} id="product-tour" className="bg-background relative min-h-[400vh]">
      <div className="sticky top-0 flex min-h-screen items-center justify-center overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="bg-primary/5 pointer-events-none absolute top-1/3 left-1/2 h-[32rem] w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
          animate={
            prefersReducedMotion === true
              ? undefined
              : { scale: [0.96, 1.06, 0.96], opacity: [0.35, 0.65, 0.35] }
          }
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative">
              <ProgressBar progress={progress} />
              <div className="relative mt-8 h-[280px]">
                {steps.map((step, index) => (
                  <TextScene key={step.id} progress={progress} index={index} step={step} />
                ))}
              </div>
            </div>

            <div className="relative h-[480px] lg:h-[600px]">
              <div className="bg-primary/8 absolute -inset-4 rounded-full opacity-60 blur-3xl" />
              <div
                aria-hidden="true"
                inert
                className="border-border/40 bg-card/90 relative h-full w-full overflow-hidden rounded-2xl border shadow-2xl shadow-black/20 backdrop-blur-sm"
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={steps[activeStep].id}
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      prefersReducedMotion === true ? undefined : { opacity: 0, y: -8, scale: 0.97 }
                    }
                    transition={{
                      duration: prefersReducedMotion === true ? 0 : 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute inset-0"
                  >
                    <DemoPanel step={activeStep} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressBar({ progress }: { progress: MotionValue<number> }) {
  const width = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <div className="flex items-center gap-4">
      <div className="bg-muted/50 h-[3px] flex-1 overflow-hidden rounded-full">
        <motion.div className="bg-primary h-full rounded-full" style={{ width }} />
      </div>
      <StepCounter progress={progress} />
    </div>
  );
}

function StepCounter({ progress }: { progress: MotionValue<number> }) {
  const opacities = [
    useTransform(progress, [0, 0.18, 0.22], [1, 1, 0]),
    useTransform(progress, [0.18, 0.22, 0.38, 0.42], [0, 1, 1, 0]),
    useTransform(progress, [0.38, 0.42, 0.58, 0.62], [0, 1, 1, 0]),
    useTransform(progress, [0.58, 0.62, 0.78, 0.82], [0, 1, 1, 0]),
    useTransform(progress, [0.78, 0.82, 1], [0, 1, 1]),
  ];

  return (
    <div className="text-muted-foreground relative mb-5 w-15 font-mono text-sm tabular-nums">
      {opacities.map((opacity, index) => (
        <motion.span key={index} className="absolute inset-0" style={{ opacity }}>
          {String(index + 1).padStart(2, '0')} / 05
        </motion.span>
      ))}
    </div>
  );
}

function TextScene({
  progress,
  index,
  step,
}: {
  progress: MotionValue<number>;
  index: number;
  step: (typeof steps)[number];
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

function DemoPanel({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <QuickCaptureDemo />;
    case 1:
      return <TimelineDemo />;
    case 2:
      return <DemoReports />;
    case 3:
      return <DemoMcpConnector />;
    case 4:
      return <DemoInsights />;
    default:
      return null;
  }
}

function QuickCaptureDemo() {
  return (
    <div className="from-card to-card/50 flex h-full flex-col items-center justify-center bg-gradient-to-b p-6">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-primary mb-2 text-xs font-medium uppercase">New note</p>
          <p className="text-muted-foreground text-sm">What happened?</p>
        </div>
        <div className="border-primary/30 bg-background/80 rounded-xl border p-4">
          <p className="text-sm leading-relaxed">
            Finished the quarterly review and walked the team through the key decisions.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="bg-primary/15 text-primary rounded-full px-3 py-1.5 text-xs font-medium">
            Q4 Planning
          </span>
          <span className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">
            Save note
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineDemo() {
  const entries = [
    { text: 'Reviewed a sign-in change.', project: 'Mobile App', time: '2h ago' },
    { text: 'Presented the quarterly update.', project: 'Q4 Planning', time: 'Yesterday' },
    { text: 'Worked with design on new layouts.', project: 'Website Redesign', time: 'Yesterday' },
  ];
  return (
    <div className="from-card to-card/50 flex h-full flex-col bg-gradient-to-b p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold">Notes this week</h3>
        <p className="text-muted-foreground text-sm">Recent notes</p>
      </div>
      <div className="relative flex-1">
        <div className="bg-primary/30 absolute top-2 bottom-2 left-[7px] w-px" />
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.text}
              initial={{ x: -8 }}
              animate={{ x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative pl-6"
            >
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
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
