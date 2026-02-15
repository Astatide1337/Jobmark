"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, Plus, Target, Users, X } from "lucide-react";

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
  selectedProjectId: string | null;
  selectedGoalId: string | null;
  selectedContactId?: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onGoalSelect: (goalId: string | null) => void;
  onContactSelect?: (contactId: string | null) => void;
}

export function ContextSelector({
  projects,
  goals,
  contacts = [],
  selectedProjectId,
  selectedGoalId,
  selectedContactId = null,
  onProjectSelect,
  onGoalSelect,
  onContactSelect,
}: ContextSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const selectedCount = useMemo(() => {
    let count = 0;
    if (selectedProject) count += 1;
    if (selectedGoal) count += 1;
    if (selectedContact) count += 1;
    return count;
  }, [selectedProject, selectedGoal, selectedContact]);

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
    window.addEventListener("resize", recalc);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [selectedProjectId, selectedGoalId, selectedContactId]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const el = scrollRef.current;
    if (!el) return;

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
    };
    setIsDragging(true);
    el.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const el = scrollRef.current;
    if (!el) return;

    const delta = event.clientX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.startScrollLeft - delta;
    updateFades();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const el = scrollRef.current;
    if (el && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
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
        className={`flex items-center gap-2 overflow-x-auto whitespace-nowrap pr-1 select-none scrollbar-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <AnimatePresence initial={false}>
        {selectedProject && (
          <motion.div
            key={`project-${selectedProject.id}`}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-muted/50">
              <span
                className="h-2 w-2 rounded-full ring-1 ring-white/10"
                style={{ backgroundColor: selectedProject.color }}
              />
              <span className="max-w-[140px] truncate text-foreground">{selectedProject.name}</span>
              <button
                type="button"
                onClick={() => onProjectSelect(null)}
                className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        {selectedGoal && (
          <motion.div
            key={`goal-${selectedGoal.id}`}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-muted/50">
              <Target className="h-3 w-3 text-primary" />
              <span className="max-w-[140px] truncate text-foreground">{selectedGoal.title}</span>
              <button
                type="button"
                onClick={() => onGoalSelect(null)}
                className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        {selectedContact && onContactSelect && (
          <motion.div
            key={`contact-${selectedContact.id}`}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-muted/50">
              <Users className="h-3 w-3 text-primary" />
              <span className="max-w-[150px] truncate text-foreground">{selectedContact.fullName}</span>
              <button
                type="button"
                onClick={() => onContactSelect(null)}
                className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-7 shrink-0 gap-1.5 rounded-full border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Context</span>
          {selectedCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {selectedCount}
            </span>
          )}
        </Button>
      </div>

      {showLeftFade && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card/95 to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card/95 to-transparent" />
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="left-1/2 top-1/2 max-h-[80vh] w-[min(42rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 p-0 lg:left-[calc(50%+8rem)]"
      >
        <CommandInput placeholder="Search projects, goals, or contacts..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => {
                    onProjectSelect(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                  {selectedProjectId === project.id && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {goals.length > 0 && (
            <>
              {projects.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Goals">
                {goals.map((goal) => (
                  <CommandItem
                    key={goal.id}
                    onSelect={() => {
                      onGoalSelect(goal.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Target className="h-4 w-4 text-primary" />
                    <span>{goal.title}</span>
                    {selectedGoalId === goal.id && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {contacts.length > 0 && onContactSelect && (
            <>
              {(projects.length > 0 || goals.length > 0) && <CommandSeparator />}
              <CommandGroup heading="Contacts">
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => {
                      onContactSelect(contact.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span>{contact.fullName}</span>
                      {contact.relationship && (
                        <span className="text-[10px] text-muted-foreground">
                          {contact.relationship}
                        </span>
                      )}
                    </div>
                    {selectedContactId === contact.id && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
