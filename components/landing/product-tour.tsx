/**
 * Product tour for the public page.
 *
 * Why: A marketing section should not run a second application while the
 * visitor scrolls past it. The tour is an ordinary, keyboard-accessible tab
 * set and mounts only the selected preview.
 */
'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { DemoMcpConnector } from './demos/demo-mcp-connector';
import { DemoReports } from './demos/demo-reports';
import { DemoInsights } from './demos/demo-insights';

const steps = [
  {
    id: 'capture',
    title: 'Write it down',
    subtitle: 'Save it while it is fresh.',
    description: 'Save what you did, fixed, or learned.',
  },
  {
    id: 'timeline',
    title: 'Keep notes together',
    subtitle: 'Add a project.',
    description: 'Group notes by project so you can find them later.',
  },
  {
    id: 'reports',
    title: 'Make a review draft',
    subtitle: 'Start with your notes.',
    description: 'Use your notes to make a review or weekly update.',
  },
  {
    id: 'assistant',
    title: 'Connect an assistant',
    subtitle: 'Get help when you want it.',
    description: 'Connect Claude, ChatGPT, or Gemini to help edit a draft.',
  },
  {
    id: 'insights',
    title: 'See your notes',
    subtitle: 'Look for patterns.',
    description: 'See which projects and days have the most notes.',
  },
] as const;

export function ProductTour() {
  const [activeStep, setActiveStep] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const step = steps[activeStep];

  const selectStep = (index: number) => {
    setActiveStep(index);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = activeStep;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (activeStep + 1) % steps.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (activeStep - 1 + steps.length) % steps.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = steps.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    selectStep(nextIndex);
  };

  return (
    <section id="product-tour" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-primary mb-3 font-mono text-sm tracking-wide uppercase">
            How it works
          </p>
          <h2 className="font-serif text-4xl leading-tight font-bold sm:text-5xl">
            Keep the useful details.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            Write things down once, then use them when a review, update, or next step comes up.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
          <div>
            <div role="tablist" aria-label="Jobmark workflow" className="space-y-2">
              {steps.map((item, index) => (
                <button
                  key={item.id}
                  ref={element => {
                    tabRefs.current[index] = element;
                  }}
                  id={`tour-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeStep === index}
                  aria-controls={`tour-panel-${item.id}`}
                  tabIndex={activeStep === index ? 0 : -1}
                  onClick={() => selectStep(index)}
                  onKeyDown={handleTabKeyDown}
                  className={
                    activeStep === index
                      ? 'border-primary/50 bg-primary/10 text-foreground w-full rounded-2xl border p-5 text-left'
                      : 'border-border/50 bg-card/30 text-muted-foreground hover:text-foreground w-full rounded-2xl border p-5 text-left transition-[color,background-color,border-color]'
                  }
                >
                  <span className="flex items-center justify-between gap-4">
                    <span>
                      <span className="text-primary mb-1 block font-mono text-xs uppercase">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="block font-semibold">{item.title}</span>
                    </span>
                    <span aria-hidden="true" className="text-primary text-lg">
                      {activeStep === index ? '→' : '·'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            id={`tour-panel-${step.id}`}
            role="tabpanel"
            aria-labelledby={`tour-tab-${step.id}`}
            className="border-border/50 bg-card/40 min-h-[440px] rounded-3xl border p-6 sm:p-8"
          >
            <div className="mb-6 max-w-lg">
              <p className="text-primary mb-2 text-sm font-medium">{step.subtitle}</p>
              <h3 className="font-serif text-3xl font-bold sm:text-4xl">{step.title}</h3>
              <p className="text-muted-foreground mt-3 leading-relaxed">{step.description}</p>
            </div>
            <div aria-live="polite" className="h-[280px] overflow-hidden rounded-2xl">
              <DemoPanel step={activeStep} />
            </div>
          </div>
        </div>
      </div>
    </section>
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
          {entries.map(entry => (
            <div key={entry.text} className="relative pl-6">
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
