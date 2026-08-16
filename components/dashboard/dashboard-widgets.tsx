'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { differenceInDays, format } from 'date-fns';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PlusCircle,
  Quote,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GoalData } from '@/app/actions/goals';
import type { UserSettingsData } from '@/app/actions/settings';

export function WorkflowStarter({
  activityCount,
  projectCount,
  summaryCount,
}: {
  activityCount: number;
  projectCount: number;
  summaryCount: number;
}) {
  const steps = [
    {
      title: 'Write your first note',
      done: activityCount > 0,
      href: '/dashboard',
      cta: 'Add a note',
    },
    {
      title: 'Create your first project',
      done: projectCount > 0,
      href: '/projects?new=true',
      cta: 'Create project',
    },
    {
      title: 'Make your first review draft',
      done: summaryCount > 0,
      href: '/reports?tab=new',
      cta: 'Make review draft',
    },
  ];

  return (
    <Card className="border-border/50 bg-card/60 mb-8 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">How it works</CardTitle>
        <CardDescription>
          Write it down, group it by project, and use it for a review or update.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="border-border/50 bg-background/40 flex flex-col gap-3 rounded-xl border p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  step.done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <p className="text-sm font-medium">{step.title}</p>
            </div>
            <Button size="sm" variant={step.done ? 'outline' : 'default'} asChild>
              <Link href={step.href}>{step.done ? 'Open' : step.cta}</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getNextBestActionSuggestion(
  activityCount: number,
  projectCount: number,
  summaryCount: number,
  hasMcpConnection: boolean
) {
  if (activityCount === 0) {
    return {
      title: 'Start with one note.',
      body: 'Write a short note about something you did.',
      href: '/dashboard',
      cta: 'Add a note',
    };
  }
  if (projectCount === 0) {
    return {
      title: 'Create a project for your notes.',
      body: 'Projects keep related notes together.',
      href: '/projects?new=true',
      cta: 'Create project',
    };
  }
  if (summaryCount === 0) {
    return {
      title: 'Make your first review draft.',
      body: 'Use your recent notes to make a draft.',
      href: '/reports?tab=new',
      cta: 'Make review draft',
    };
  }
  if (hasMcpConnection) {
    return {
      title: 'Make your next review draft.',
      body: 'Use a connected assistant to turn your notes into an update.',
      href: '/reports?tab=new',
      cta: 'Make review draft',
    };
  }
  return {
    title: 'Use your notes for your next review.',
    body: 'Check your drafts, then connect an assistant if you want help editing them.',
    href: '/settings/connections',
    cta: 'Connect an assistant',
  };
}

export function NextBestAction({
  activityCount,
  projectCount,
  summaryCount,
  hasMcpConnection,
}: {
  activityCount: number;
  projectCount: number;
  summaryCount: number;
  hasMcpConnection: boolean;
}) {
  const suggestion = getNextBestActionSuggestion(
    activityCount,
    projectCount,
    summaryCount,
    hasMcpConnection
  );

  return (
    <Card className="border-border/50 bg-card/60 rounded-2xl">
      <CardContent className="flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">Next step</p>
          <h3 className="text-foreground mt-1 text-lg font-semibold">{suggestion.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{suggestion.body}</p>
        </div>
        <Button asChild>
          <Link href={suggestion.href}>{suggestion.cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface Project {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
}

interface GoalMotivatorProps {
  goals: GoalData[];
  settings: UserSettingsData | null;
}

function getGoalMotionX(shouldReduceMotion: boolean | null, direction: number, entering: boolean) {
  if (shouldReduceMotion === true) return 0;
  if (entering) return direction > 0 ? 1000 : -1000;
  return direction < 0 ? 1000 : -1000;
}

export function GoalMotivator({ goals, settings }: GoalMotivatorProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasGoals = goals.length > 0;
  const showLegacy = !hasGoals && settings?.primaryGoal;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (goals.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % goals.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [goals.length]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex(prev => {
      let next = prev + newDirection;
      if (next < 0) next = goals.length - 1;
      if (next >= goals.length) next = 0;
      return next;
    });
  };

  if (!hasGoals && !showLegacy) {
    return (
      <Card className="mb-8 border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center space-y-3 py-8 text-center">
          <div className="bg-primary/10 rounded-full p-3">
            <Target className="text-primary h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">No goals set yet</h2>
            <p className="text-muted-foreground text-sm">Goals help you decide what to work on.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <PlusCircle className="mr-2 h-4 w-4" />
              Set a goal
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showLegacy && settings?.primaryGoal) {
    const deadline = settings.goalDeadline ? new Date(settings.goalDeadline) : null;
    const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
    return (
      <Card className="border-primary/10 from-card to-primary/5 relative mb-8 overflow-hidden bg-gradient-to-br shadow-sm">
        <div className="bg-primary/5 absolute top-0 right-0 h-32 w-32 -translate-x-8 -translate-y-16 rounded-full blur-3xl" />
        <CardContent className="relative p-6">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-primary mb-1 flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                <span>Main goal</span>
              </div>
              <h2 className="text-foreground/90 text-xl font-bold tracking-tight md:text-2xl">
                {settings.primaryGoal}
              </h2>
            </div>
            {settings.whyStatement && (
              <div className="border-primary/10 flex gap-2 border-t pt-3">
                <Quote className="text-primary/60 mt-0.5 h-3 w-3 shrink-0" />
                <p className="text-foreground/80 text-sm leading-relaxed font-medium italic">
                  &ldquo;{settings.whyStatement}&rdquo;
                </p>
              </div>
            )}
            {deadline && daysLeft !== null && (
              <div className="absolute top-6 right-6 hidden text-right md:block">
                <div className="text-primary text-2xl font-bold">{daysLeft}</div>
                <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Days left
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentGoal = goals[currentIndex];
  const deadline = currentGoal.deadline ? new Date(currentGoal.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const variants = {
    enter: (dir: number) => ({ x: getGoalMotionX(shouldReduceMotion, dir, true), opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir: number) => ({
      zIndex: 0,
      x: getGoalMotionX(shouldReduceMotion, dir, false),
      opacity: 0,
    }),
  };

  return (
    <Card className="border-primary/10 from-card to-primary/5 relative mb-8 h-[180px] overflow-hidden bg-gradient-to-br shadow-sm md:h-[200px]">
      <div className="bg-primary/5 absolute top-0 right-0 h-32 w-32 -translate-x-8 -translate-y-16 rounded-full blur-3xl" />
      <CardContent className="relative flex h-full items-center p-6">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full flex-1 gap-6 md:flex md:items-center md:justify-between"
          >
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-primary mb-1 flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4" />
                  <span>Goal {goals.length > 1 && `(${currentIndex + 1}/${goals.length})`}</span>
                </div>
                <h2 className="text-foreground/90 line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
                  {currentGoal.title}
                </h2>
              </div>
              {currentGoal.why && (
                <div className="flex gap-2">
                  <Quote className="text-primary/60 mt-0.5 h-3 w-3 shrink-0" />
                  <p className="text-foreground/80 line-clamp-2 text-sm leading-relaxed font-medium italic">
                    &ldquo;{currentGoal.why}&rdquo;
                  </p>
                </div>
              )}
            </div>
            {deadline && daysLeft !== null && (
              <div className="border-primary/10 hidden min-w-[100px] flex-col items-end border-l py-2 pl-6 md:flex">
                <div className="text-primary text-3xl font-bold">{daysLeft}</div>
                <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Days left
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {format(deadline, 'MMM d, yyyy')}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {goals.length > 1 && (
          <div className="absolute right-4 bottom-[-10px] flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background h-8 w-8 rounded-full backdrop-blur-sm"
              onClick={() => paginate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background h-8 w-8 rounded-full backdrop-blur-sm"
              onClick={() => paginate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectChipSelectorProps {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProjectChipSelector({ projects, selectedId, onSelect }: ProjectChipSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedId);
  if (projects.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all',
          'bg-background/50 hover:bg-background/80',
          isExpanded
            ? 'border-primary/50 ring-primary/20 ring-2'
            : 'border-border/50 hover:border-border'
        )}
      >
        {selectedProject ? (
          <>
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedProject.color }}
            />
            <span className="text-foreground text-sm">{selectedProject.name}</span>
          </>
        ) : (
          <>
            <FolderOpen className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-sm">No project</span>
          </>
        )}
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border-border/50 absolute top-full left-0 z-50 mt-2 w-full min-w-[200px] rounded-xl border p-2 shadow-xl"
          >
            <ProjectChip
              name="No project"
              color=""
              isSelected={!selectedId}
              onClick={() => {
                onSelect('');
                setIsExpanded(false);
              }}
            />
            {projects.map(project => (
              <ProjectChip
                key={project.id}
                name={project.name}
                color={project.color}
                isSelected={selectedId === project.id}
                onClick={() => {
                  onSelect(project.id);
                  setIsExpanded(false);
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {isExpanded && <div className="fixed inset-0 z-40" onClick={() => setIsExpanded(false)} />}
    </div>
  );
}

function ProjectChip({
  name,
  color,
  isSelected,
  onClick,
}: {
  name: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all',
        isSelected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {color ? (
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <FolderOpen className="text-muted-foreground h-3 w-3 shrink-0" />
      )}
      <span className="flex-1 truncate text-sm">{name}</span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="text-primary h-4 w-4" />
        </motion.div>
      )}
    </button>
  );
}
