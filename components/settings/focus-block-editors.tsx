'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FocusBlock, BreathingPattern, FocusBlockType } from '@/lib/focus/types';
import { BREATHING_PATTERNS, BLOCK_LABELS } from '@/lib/focus/defaults';
import type { GoalData } from '@/app/actions/goals';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { BreathingDisplay } from '@/components/focus/breathing-display';

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  breathing: <Wind className="h-4 w-4" />,
  affirmation: <Sparkles className="h-4 w-4" />,
  goal: <Target className="h-4 w-4" />,
};
export function AddBlockSelector({ onSelect }: { onSelect: (type: FocusBlockType) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const OPTIONS: { type: FocusBlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'breathing', label: 'Breathing', icon: <Wind className="h-4 w-4" /> },
    { type: 'affirmation', label: 'Short reminders', icon: <Sparkles className="h-4 w-4" /> },
    { type: 'goal', label: 'Think about your goal', icon: <Target className="h-4 w-4" /> },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 transition-[color,background-color,border-color,box-shadow]',
          'bg-background/50 hover:bg-background/80',
          isOpen
            ? 'border-primary/50 ring-primary/20 ring-2'
            : 'border-border/50 hover:border-border'
        )}
      >
        <span className="text-sm font-medium">Add block</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border-border/50 absolute top-full right-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border p-2 shadow-xl shadow-black/20"
            >
              {OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => {
                    onSelect(opt.type);
                    setIsOpen(false);
                  }}
                  className="hover:bg-primary/10 hover:text-primary flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                >
                  <div className="text-primary/60">{opt.icon}</div>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </motion.div>
            <button
              type="button"
              aria-label="Close block picker"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableBlockCard
// ---------------------------------------------------------------------------

export function SortableBlockCard({
  block,
  goals,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
}: {
  block: FocusBlock;
  goals: GoalData[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (updated: FocusBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        'group relative rounded-2xl border transition-[border-color,background-color,box-shadow,opacity] duration-300',
        isDragging ? 'opacity-50' : 'opacity-100',
        isExpanded
          ? 'border-primary/30 bg-card/80 shadow-lg'
          : 'border-border/40 bg-card hover:border-border'
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${BLOCK_LABELS[block.type]} block`}
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab px-1.5 active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="flex flex-1 items-center gap-3 text-left"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`focus-block-${block.id}`}
        >
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            {BLOCK_ICONS[block.type]}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">{BLOCK_LABELS[block.type]}</h4>
            {!isExpanded && (
              <p className="text-muted-foreground line-clamp-1 text-xs font-medium">
                {block.type === 'breathing' && BREATHING_PATTERNS[block.config.pattern].label}
                {block.type === 'affirmation' && `${block.config.texts.length} reminders`}
                {block.type === 'goal' && 'Think about your goal'}
              </p>
            )}
          </div>
          <div className="text-muted-foreground/40 group-hover:text-muted-foreground pr-2 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${BLOCK_LABELS[block.type]} block`}
          className="text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive bg-background absolute -top-2 -right-2 rounded-full border p-1.5 opacity-0 shadow-sm transition-[color,background-color,opacity] group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id={`focus-block-${block.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-6 pt-4 pb-6">
              <BlockEditor block={block} goals={goals} onUpdate={onUpdate} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlockEditor
// ---------------------------------------------------------------------------

function BlockEditor({
  block,
  goals,
  onUpdate,
}: {
  block: FocusBlock;
  goals: GoalData[];
  onUpdate: (updated: FocusBlock) => void;
}) {
  switch (block.type) {
    case 'breathing':
      return <BreathingCarousel block={block} onUpdate={onUpdate} />;
    case 'affirmation':
      return <AffirmationEditor block={block} onUpdate={onUpdate} />;
    case 'goal':
      return <GoalCarousel block={block} goals={goals} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// BreathingPreview — auto-advancing preview for settings
// ---------------------------------------------------------------------------

function BreathingPreview({ pattern }: { pattern: BreathingPattern }) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const steps = patternDef.steps;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const currentStep = steps[stepIndex];
    const advance = setTimeout(() => {
      setStepIndex(prev => (prev + 1) % steps.length);
    }, currentStep.duration * 1000);

    return () => clearTimeout(advance);
  }, [stepIndex, steps]);

  return (
    <div className="pointer-events-none w-full opacity-80">
      <BreathingDisplay
        pattern={pattern}
        stepIndex={stepIndex}
        cycleIndex={0}
        totalCycles={1}
        size="settings"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BreathingCarousel
// ---------------------------------------------------------------------------

function BreathingCarousel({
  block,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'breathing' }>;
  onUpdate: (b: FocusBlock) => void;
}) {
  const patterns = Object.keys(BREATHING_PATTERNS) as BreathingPattern[];
  const currentIndex = patterns.indexOf(block.config.pattern);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    const nextIndex = (currentIndex + newDirection + patterns.length) % patterns.length;
    setDirection(newDirection);
    onUpdate({ ...block, config: { ...block.config, pattern: patterns[nextIndex] } });
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      zIndex: 0,
    }),
  };

  const def = BREATHING_PATTERNS[block.config.pattern];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Breathing pattern
        </Label>
        <div className="flex items-center gap-3">
          <Label htmlFor={`focus-breathing-rounds-${block.id}`} className="text-xs font-medium">
            Rounds
          </Label>
          <Input
            id={`focus-breathing-rounds-${block.id}`}
            type="number"
            min={1}
            max={10}
            value={block.config.cycles}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, cycles: parseInt(e.target.value) || 3 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="bg-muted/20 relative overflow-hidden rounded-3xl border p-2">
        <div className="relative h-[360px] w-full items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={block.config.pattern}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-4 flex flex-col items-center">
                <span className="text-lg font-bold">{def.label}</span>
                <p className="text-muted-foreground mt-1 max-w-[240px] text-xs leading-relaxed">
                  {def.description}
                </p>
              </div>

              {/* Visual Preview */}
              <div className="relative mt-2 flex h-[220px] w-full max-w-[360px] items-center justify-center overflow-hidden rounded-2xl bg-black/60 shadow-inner">
                <BreathingPreview pattern={block.config.pattern} />
                <div className="absolute inset-0 z-10" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(-1)}
            aria-label="Previous breathing pattern"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(1)}
            aria-label="Next breathing pattern"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {patterns.map((p, i) => (
            <div
              key={p}
              className={cn(
                'h-1 rounded-full transition-[width,background-color] duration-300',
                i === currentIndex ? 'bg-primary w-4' : 'bg-primary/20 w-1'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GoalCarousel
// ---------------------------------------------------------------------------

function GoalCarousel({
  block,
  goals,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'goal' }>;
  goals: GoalData[];
  onUpdate: (b: FocusBlock) => void;
}) {
  const options = [
    {
      id: undefined,
      title: 'Use my main goal',
      why: 'Uses your main goal.',
    },
    ...goals,
  ];
  const currentIndex = options.findIndex(o => o.id === block.config.goalId);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    const nextIndex = (currentIndex + newDirection + options.length) % options.length;
    setDirection(newDirection);
    onUpdate({ ...block, config: { ...block.config, goalId: options[nextIndex].id } });
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      zIndex: 0,
    }),
  };

  const currentOption = options[currentIndex] || options[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Choose a goal
        </Label>
        <div className="flex items-center gap-3">
          <Label htmlFor={`focus-goal-duration-${block.id}`} className="text-xs font-medium">
            Duration <span className="sr-only">in seconds</span>
          </Label>
          <Input
            id={`focus-goal-duration-${block.id}`}
            type="number"
            min={5}
            max={60}
            value={block.config.duration}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, duration: parseInt(e.target.value) || 15 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="bg-muted/20 relative overflow-hidden rounded-3xl border p-2">
        <div className="relative h-[200px] w-full items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentOption.id ?? 'auto'}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{currentOption.title}</span>
                <p className="text-muted-foreground mt-2 max-w-[280px] text-xs leading-relaxed italic">
                  &quot;{currentOption.why || 'Think about your next step.'}&quot;
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(-1)}
            aria-label="Previous goal"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(1)}
            aria-label="Next goal"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {options.map((o, i) => (
            <div
              key={o.id ?? 'auto'}
              className={cn(
                'h-1 rounded-full transition-[width,background-color] duration-300',
                i === currentIndex ? 'bg-primary w-4' : 'bg-primary/20 w-1'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AffirmationEditor
// ---------------------------------------------------------------------------

function AffirmationEditor({
  block,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'affirmation' }>;
  onUpdate: (b: FocusBlock) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Short reminders
        </Label>
        <div className="flex items-center gap-3">
          <Label htmlFor={`focus-reminder-duration-${block.id}`} className="text-xs font-medium">
            Duration <span className="sr-only">in seconds</span>
          </Label>
          <Input
            id={`focus-reminder-duration-${block.id}`}
            type="number"
            min={10}
            max={300}
            value={block.config.totalDuration}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, totalDuration: parseInt(e.target.value) || 60 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {block.config.texts.map((text, i) => (
          <div key={i} className="group flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
              {i + 1}
            </div>
            <Input
              aria-label={`Reminder ${i + 1}`}
              value={text}
              onChange={e => {
                const newTexts = [...block.config.texts];
                newTexts[i] = e.target.value;
                onUpdate({ ...block, config: { ...block.config, texts: newTexts } });
              }}
              placeholder="Write a short reminder..."
              className="border-border/40 bg-muted/20 focus:bg-background h-10"
            />
            <button
              type="button"
              onClick={() => {
                const newTexts = block.config.texts.filter((_, idx) => idx !== i);
                onUpdate({ ...block, config: { ...block.config, texts: newTexts } });
              }}
              aria-label={`Delete reminder ${i + 1}`}
              className="text-muted-foreground/30 hover:text-destructive opacity-0 transition-[color,opacity] group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onUpdate({ ...block, config: { ...block.config, texts: [...block.config.texts, ''] } })
          }
          className="text-muted-foreground hover:text-primary w-full rounded-2xl border border-dashed py-6"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add reminder
        </Button>
      </div>
    </div>
  );
}
