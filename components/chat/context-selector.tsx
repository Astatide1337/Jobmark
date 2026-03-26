/**
 * AI Context Selector (Horizontal Scroll)
 *
 * Why: LLMs are only as good as the context they are given. This component
 * provides a gesture-friendly "Chip" interface for users to attach
 * Projects, Goals, Reports, or Contacts to their conversation.
 *
 * Interaction Design:
 * - Mouse Dragging: Implements custom pointer event listeners to allow
 *   horizontal dragging on desktop (overflow-x).
 * - Animated Transitions: Uses `Framer Motion` for high-quality entry/exit
 *   of context chips.
 * - Dynamic Fades: Intelligently calculates edge-gradients to signal
 *   hidden content in the scroll area.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target, Users, X, Plus, FileText } from 'lucide-react';

type ContactOption = {
  id: string;
  fullName: string;
  relationship: string | null;
  interactionsCount: number;
};

interface ContextSelectorProps {
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts?: ContactOption[];
  reports?: Array<{ id: string; title: string; createdAt: Date }>;
  selectedProjectIds: string[];
  selectedGoalIds: string[];
  selectedContactIds: string[];
  selectedReportIds: string[];
  onProjectSelect: (projectIds: string[]) => void;
  onProjectRemove: (projectId: string) => void;
  onGoalSelect: (goalIds: string[]) => void;
  onGoalRemove: (goalId: string) => void;
  onContactSelect: (contactIds: string[]) => void;
  onContactRemove: (contactId: string) => void;
  onReportSelect: (reportIds: string[]) => void;
  onReportRemove: (reportId: string) => void;
  onOpenContextModal: () => void;
}

export function ContextSelector({
  projects,
  goals,
  contacts = [],
  reports = [],
  selectedProjectIds,
  selectedGoalIds,
  selectedContactIds,
  selectedReportIds,
  onProjectSelect,
  onProjectRemove,
  onGoalSelect,
  onGoalRemove,
  onContactSelect,
  onContactRemove,
  onReportSelect,
  onReportRemove,
  onOpenContextModal,
}: ContextSelectorProps) {
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const isDraggingRef = useRef(false);

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
  const selectedGoals = goals.filter(g => selectedGoalIds.includes(g.id));
  const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));
  const selectedReports = reports.filter(r => selectedReportIds.includes(r.id));

  const selectedCount =
    selectedProjects.length +
    selectedGoals.length +
    selectedContacts.length +
    selectedReports.length;

  const updateFades = () => {
    const el = scrollRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    if (!hasOverflow) {
      setShowLeftFade(false);
      setShowRightFade(false);
      return;
    }

    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const recalc = () => {
      requestAnimationFrame(() => updateFades());
    };

    recalc();

    const resizeObserver = new ResizeObserver(recalc);
    resizeObserver.observe(el);
    window.addEventListener('resize', recalc);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [
    selectedProjectIds,
    selectedGoalIds,
    selectedContactIds,
    selectedReportIds,
    selectedProjects.length,
    selectedGoals.length,
    selectedContacts.length,
    selectedReports.length,
  ]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;

    const el = scrollRef.current;
    if (!el) return;

    isDraggingRef.current = false;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
    };
    el.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const el = scrollRef.current;
    if (!el) return;

    const deltaX = event.clientX - dragRef.current.startX;

    if (!isDraggingRef.current && Math.abs(deltaX) > 5) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }

    if (isDraggingRef.current) {
      el.scrollLeft = dragRef.current.startScrollLeft - deltaX;
      updateFades();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }

    dragRef.current.active = false;

    requestAnimationFrame(() => {
      setIsDragging(false);
      isDraggingRef.current = false;
    });

    updateFades();
  };

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={updateFades}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'scrollbar-none flex items-center gap-2 overflow-x-auto pr-1 whitespace-nowrap select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <AnimatePresence initial={false}>
          {selectedProjects.map(project => (
            <motion.div
              key={`project-${project.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="shrink-0"
            >
              <div className="border-border/50 bg-card hover:bg-muted/50 hover:border-primary/20 group/chip flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all">
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/10"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-foreground group-hover/chip:text-primary max-w-[140px] truncate transition-colors">
                  {project.name}
                </span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    onProjectRemove(project.id);
                  }}
                  className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}

          {selectedGoals.map(goal => (
            <motion.div
              key={`goal-${goal.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="shrink-0"
            >
              <div className="border-border/50 bg-card hover:bg-muted/50 hover:border-primary/20 group/chip flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all">
                <Target className="text-primary h-3 w-3" />
                <span className="text-foreground group-hover/chip:text-primary max-w-[140px] truncate transition-colors">
                  {goal.title}
                </span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    onGoalRemove(goal.id);
                  }}
                  className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}

          {selectedContacts.map(contact => (
            <motion.div
              key={`contact-${contact.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="shrink-0"
            >
              <div className="border-border/50 bg-card hover:bg-muted/50 hover:border-primary/20 group/chip flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all">
                <Users className="text-primary h-3 w-3" />
                <span className="text-foreground group-hover/chip:text-primary max-w-[150px] truncate transition-colors">
                  {contact.fullName}
                </span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    onContactRemove(contact.id);
                  }}
                  className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}

          {selectedReports.map(report => (
            <motion.div
              key={`report-${report.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="shrink-0"
            >
              <div className="border-border/50 bg-card hover:bg-muted/50 hover:border-primary/20 group/chip flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all">
                <FileText className="text-primary h-3 w-3" />
                <span className="text-foreground group-hover/chip:text-primary max-w-[150px] truncate transition-colors">
                  {report.title}
                </span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    onReportRemove(report.id);
                  }}
                  className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="sm"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            if (isDraggingRef.current) return;
            onOpenContextModal();
          }}
          className="border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary h-7 shrink-0 gap-1.5 rounded-full border border-dashed px-2.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Evidence</span>
          {selectedCount > 0 && (
            <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              {selectedCount}
            </span>
          )}
        </Button>
      </div>

      {showLeftFade && (
        <div className="from-card/95 pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent" />
      )}
      {showRightFade && (
        <div className="from-card/95 pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent" />
      )}
    </div>
  );
}
