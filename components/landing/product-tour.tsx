"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, type MotionValue } from "framer-motion";
import { DemoChat } from "./demos/demo-chat";
import { DemoReports } from "./demos/demo-reports";
import { DemoInsights } from "./demos/demo-insights";

const steps = [
  {
    id: "capture",
    title: "Capture in seconds",
    subtitle: "Not another task list.",
    description: "Type what you accomplished. That's it. No categories to choose, no forms to fill out.",
  },
  {
    id: "timeline",
    title: "Your timeline builds itself",
    subtitle: "Organized automatically.",
    description: "Every entry lands on your timeline. AI detects projects and themes without manual tagging.",
  },
  {
    id: "reports",
    title: "Generate polished reports",
    subtitle: "From notes to narrative.",
    description: "Select a date range and tone. AI transforms your entries into professional reports.",
  },
  {
    id: "mentor",
    title: "Chat with AI Mentor",
    subtitle: "Your career coach, 24/7.",
    description: "Stuck on a goal? Chat with an AI trained on proven productivity methods.",
  },
  {
    id: "insights",
    title: "Discover your patterns",
    subtitle: "Data-driven self-awareness.",
    description: "Streak tracking, heatmaps, project distribution. See when you're most productive.",
  },
];

export function ProductTour() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section ref={containerRef} id="product-tour" className="relative h-[500vh]">
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex items-center justify-center bg-background">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
        
        {/* Main content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left: Text content */}
            <div className="relative">
              {/* Progress indicator */}
              <ProgressBar progress={smoothProgress} />
              
              {/* Text scenes container */}
              <div className="relative h-[280px] mt-8">
                {steps.map((step, index) => (
                  <TextScene key={step.id} progress={smoothProgress} index={index} step={step} />
                ))}
              </div>
            </div>

            {/* Right: Demo preview */}
            <div className="relative h-[400px] lg:h-[500px]">
              {/* Ambient glow */}
              <div className="absolute -inset-4 bg-primary/8 blur-3xl rounded-full opacity-60" />
              
              {/* Demo container */}
              <div className="relative w-full h-full rounded-2xl border border-border/40 bg-card/90 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden">
                {/* Demo scenes */}
                <DemoScene progress={smoothProgress} index={0}>
                  <QuickCaptureDemo />
                </DemoScene>
                <DemoScene progress={smoothProgress} index={1}>
                  <TimelineDemo />
                </DemoScene>
                <DemoScene progress={smoothProgress} index={2}>
                  <div className="w-full h-full scale-[0.55] origin-top-left">
                    <div className="w-[182%] h-[182%]">
                      <DemoReports />
                    </div>
                  </div>
                </DemoScene>
                <DemoScene progress={smoothProgress} index={3}>
                  <div className="w-full h-full scale-[0.55] origin-top-left">
                    <div className="w-[182%] h-[182%]">
                      <DemoChat />
                    </div>
                  </div>
                </DemoScene>
                <DemoScene progress={smoothProgress} index={4}>
                  <div className="w-full h-full scale-[0.55] origin-top-left">
                    <div className="w-[182%] h-[182%]">
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
  const width = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-[3px] bg-muted/50 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
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
    <div className="relative mb-5 w-15 text-sm font-mono text-muted-foreground tabular-nums">
      <motion.span className="absolute inset-0" style={{ opacity: step1 }}>01 / 05</motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step2 }}>02 / 05</motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step3 }}>03 / 05</motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step4 }}>04 / 05</motion.span>
      <motion.span className="absolute inset-0" style={{ opacity: step5 }}>05 / 05</motion.span>
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

  const opacity = useTransform(
    progress,
    [start, start + 0.05, end, end + 0.05],
    [0, 1, 1, 0]
  );

  const y = useTransform(
    progress,
    [start, start + 0.05, end, end + 0.05],
    [40, 0, 0, -40]
  );

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center"
      style={{ opacity, y }}
    >
      <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">
        {step.subtitle}
      </p>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-[1.1] mb-4">
        {step.title}
      </h2>
      <p className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-lg">
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

  const opacity = useTransform(
    progress,
    [start, start + 0.05, end, end + 0.05],
    [0, 1, 1, 0]
  );

  const scale = useTransform(
    progress,
    [start, start + 0.05, end, end + 0.05],
    [0.96, 1, 1, 0.96]
  );

  return (
    <motion.div
      className="absolute inset-0"
      style={{ opacity, scale }}
    >
      {children}
    </motion.div>
  );
}

// Quick Capture Demo
function QuickCaptureDemo() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-card to-card/50">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            Quick Capture
          </div>
          <p className="text-sm text-muted-foreground">What did you accomplish?</p>
        </div>

        {/* Input area */}
        <div className="p-4 rounded-xl border border-primary/30 bg-background/80 backdrop-blur-sm">
          <p className="text-sm leading-relaxed">
            Completed the quarterly report and presented findings to the team. Received positive feedback on the data visualizations.
          </p>
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-medium">
            Q4 Planning
          </span>
          <button className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
    { text: "Reviewed pull request for auth module", project: "Mobile App", time: "2h ago" },
    { text: "Completed quarterly report presentation", project: "Q4 Planning", time: "Yesterday" },
    { text: "Synced with design team on new layouts", project: "Website Redesign", time: "Yesterday" },
  ];

  return (
    <div className="h-full flex flex-col p-6 bg-gradient-to-b from-card to-card/50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Your Timeline</h3>
        <p className="text-sm text-muted-foreground">This week's accomplishments</p>
      </div>

      {/* Timeline */}
      <div className="relative flex-1">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />

        <div className="space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className="relative pl-6">
              <div className="absolute left-0 top-2.5 h-[14px] w-[14px] rounded-full border-2 border-primary bg-background" />
              <div className="p-3 rounded-lg bg-background/60 border border-border/30">
                <p className="text-sm font-medium leading-snug">{entry.text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                    {entry.project}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
