"use client";

import { useActionState, useEffect, useRef, useState, useMemo } from "react";
import { createActivity, type ActivityFormState } from "@/app/actions/activities";
import { improveText } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ProjectChipSelector } from "@/components/project/project-chip-selector";
import { Loader2, Send, CalendarIcon, Sparkles, ArrowUp, X } from "lucide-react";
import { format, isToday, isYesterday, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useSettings } from "@/components/providers/settings-provider";

const initialState: ActivityFormState = {
  success: false,
  message: "",
};

const confettiColors = ["#d4a574", "#c49a6c", "#e0a458", "#f5f0e8", "#a89888"];

function triggerConfetti() {
  const defaults = {
    colors: confettiColors,
    ticks: 200,
    gravity: 1,
    scalar: 1,
    drift: 0,
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: 50,
    angle: 55,
    spread: 60,
    origin: { x: 0.1, y: 0.9 },
    startVelocity: 45,
  });
  
  confetti({
    ...defaults,
    particleCount: 50,
    angle: 125,
    spread: 60,
    origin: { x: 0.9, y: 0.9 },
    startVelocity: 45,
  });

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 35,
      angle: 60,
      spread: 70,
      origin: { x: 0.05, y: 0.95 },
      startVelocity: 55,
    });
    
    confetti({
      ...defaults,
      particleCount: 35,
      angle: 120,
      spread: 70,
      origin: { x: 0.95, y: 0.95 },
      startVelocity: 55,
    });
  }, 100);

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 25,
      angle: 90,
      spread: 120,
      origin: { x: 0.5, y: 1 },
      startVelocity: 30,
      gravity: 1.2,
    });
  }, 200);
}

interface Project {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
}

interface QuickCaptureProps {
  projects?: Project[];
  todayCount?: number;
  dailyGoal?: number;
}

export function QuickCapture({ projects = [], todayCount = 0, dailyGoal = 3 }: QuickCaptureProps) {
  const { settings } = useSettings();
  const [state, formAction, isPending] = useActionState(createActivity, initialState);
  const [content, setContent] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Enhancement state
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Filter projects based on hideArchived setting
  const visibleProjects = useMemo(() => {
    if (settings?.hideArchived) {
      return projects.filter(p => !p.archived);
    }
    return projects;
  }, [projects, settings?.hideArchived]);

  // Detect OS on mount
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"));
  }, []);

  useEffect(() => {
    if (state.success) {
      setContent("");
      setSelectedDate(new Date()); // Reset to today
      
      // Only trigger confetti if setting is enabled (default true)
      if (settings?.showConfetti !== false) {
        triggerConfetti();
      }
      
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [state, settings?.showConfetti]);

  const charCount = content.length;
  const isValidLength = charCount >= 10 && charCount <= 1000;

  // Get formatted date label
  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Today";
    if (isYesterday(selectedDate)) return "Yesterday";
    return format(selectedDate, "MMM d");
  };

  // Global keyboard listener for Ctrl/Cmd + Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isValidLength && !isPending) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isValidLength, isPending]);

  // Handle text selection for AI enhancement
  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content.substring(start, end);

      setSelection({ start, end, text });
      // Position is handled by the ref callback in the render loop or useEffect
    } else {
      setSelection(null);
      setMenuPosition(null);
    }
  };

  // Handle AI improvement
  const handleImprove = async () => {
    if (!selection || !instruction) return;
    setIsImproving(true);

    try {
      const improved = await improveText(selection.text, instruction);
      if (improved) {
        const before = content.substring(0, selection.start);
        const after = content.substring(selection.end);
        
        const newContent = before + improved + after;
        setContent(newContent);
        
        setSelection(null);
        setInstruction("");
        setMenuPosition(null);
      }
    } catch (error) {
      console.error("Improvement failed", error);
    } finally {
      setIsImproving(false);
    }
  };

  // Dismiss AI toolbar
  const dismissToolbar = () => {
    setSelection(null);
    setInstruction("");
    setMenuPosition(null);
  };

  return (
    <Card className="bg-card border-border/50 warm-glow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Quick Capture</CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full ${
            todayCount >= dailyGoal 
              ? "bg-green-500/20 text-green-400" 
              : "bg-primary/20 text-primary"
          }`}>
            {todayCount}/{dailyGoal} today
          </span>
        </div>
        <CardDescription>
          What did you accomplish {isToday(selectedDate) ? "today" : isYesterday(selectedDate) ? "yesterday" : `on ${format(selectedDate, "MMM d")}`}?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction}>
          <div className="space-y-4">
            {/* Textarea with selection highlight (Mirrored from LiveEditor) */}
            <div className="relative group">
              {/* Ref for container to calculate positions */}
              <div ref={textareaRef.current?.parentElement as any} className="relative w-full"> 
                {/* 1. Backdrop Highlight Layer */}
                <div 
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-transparent z-0",
                    "min-h-[100px] w-full rounded-md border border-transparent px-3 py-2 text-sm shadow-sm", // Match Textarea styles
                    "bg-transparent"
                  )}
                >
                  {selection ? (
                    <>
                      {content.substring(0, selection.start)}
                      <span 
                        ref={(el) => {
                          // We need to capture this ref to calculate position
                          if (el && !menuPosition) {
                            const container = textareaRef.current;
                            if (container) {
                              const spanRect = el.getBoundingClientRect();
                              const containerRect = container.getBoundingClientRect();
                              const top = spanRect.bottom - containerRect.top; 
                              const left = spanRect.left - containerRect.left + (spanRect.width / 2);
                              setMenuPosition({ top, left });
                            }
                          }
                        }}
                        className="bg-primary/20 text-transparent rounded-[2px]"
                      >
                        {content.substring(selection.start, selection.end)}
                      </span>
                      {content.substring(selection.end)}
                    </>
                  ) : (
                    content
                  )}
                   {/* Trailing break to ensure height match */}
                   <br />
                </div>

                {/* 2. Actual Textarea */}
                <Textarea
                  ref={textareaRef}
                  name="content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    // Clear selection on edit
                    if (selection) {
                      setSelection(null);
                      setMenuPosition(null);
                    }
                  }}
                  onSelect={handleSelect}
                  placeholder="I completed the quarterly report and presented findings to the team..."
                  className="relative z-10 min-h-[100px] bg-transparent resize-none border-border/50 pr-16 focus:bg-background/50 transition-colors"
                  disabled={isPending}
                  data-quick-capture="true"
                  onBlur={() => {
                     // Delay to allow clicking toolbar
                     setTimeout(() => {
                       if (!isImproving) {
                          // Optional: Auto-dismiss if needed, but per LiveEditor we might want to keep it if active
                       }
                     }, 200);
                  }}
                />
              </div>
              
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground z-20 pointer-events-none">
                <span className={charCount < 10 ? "text-destructive" : ""}>
                  {charCount}
                </span>
                /1000
              </div>

              {/* Floating AI Copilot Toolbar */}
              <AnimatePresence>
                {selection && menuPosition && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.95 }}
                    animate={{ opacity: 1, y: 6, scale: 1 }}
                    exit={{ opacity: 0, y: 0, scale: 0.95 }}
                    style={{ 
                      top: menuPosition.top, 
                      left: menuPosition.left,
                      transform: "translateX(-50%)" 
                    }}
                    className="absolute z-50 flex flex-col items-center origin-top bg-transparent"
                  >
                    {/* Arrow pointer */}
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-popover absolute -top-[6px] left-1/2 -translate-x-1/2 drop-shadow-sm" />

                    <div className="bg-popover border border-border shadow-xl rounded-xl p-1 flex items-center gap-2 w-[340px]">
                      <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 ml-1">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      
                      <Input
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Enhance: 'make it professional'"
                        className="h-9 border-none bg-transparent focus-visible:ring-0 px-2 text-sm shadow-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleImprove();
                          }
                          if (e.key === "Escape") dismissToolbar();
                        }}
                        autoFocus 
                      />
                      
                      <div className="flex items-center gap-1 border-l pl-1 pr-1">
                        <Button 
                          type="button"
                          size="icon" 
                          variant="ghost" 
                          className={cn("h-8 w-8 hover:bg-primary/10 hover:text-primary", instruction && "text-primary")}
                          onClick={handleImprove}
                          disabled={!instruction || isImproving}
                        >
                          {isImproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                        </Button>
                        <Button 
                          type="button"
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={dismissToolbar}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Project chips + Date picker row */}
            <div className="flex flex-wrap items-center gap-3">
              {projects.length > 0 && (
                <>
                  <input type="hidden" name="projectId" value={selectedProject} />
                  <ProjectChipSelector
                    projects={visibleProjects}
                    selectedId={selectedProject}
                    onSelect={setSelectedProject}
                  />
                </>
              )}

              {/* Date Override Picker */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-muted-foreground",
                      "bg-background/50 hover:bg-background/80 hover:text-foreground",
                      datePickerOpen 
                        ? "border-primary/50 ring-2 ring-primary/20 text-foreground" 
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm">{getDateLabel()}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {state.errors?.content && (
              <p className="text-sm text-destructive">
                {state.errors.content[0]}
              </p>
            )}
            
            {!state.success && state.message && !state.errors && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">{isMac ? "Cmd" : "Ctrl"}</kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Enter</kbd>
                {" to save"}
              </p>
              
              {/* Send selected date */}
              <input type="hidden" name="logDate" value={format(selectedDate, "yyyy-MM-dd")} />

              <Button 
                type="submit" 
                disabled={!isValidLength || isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Save Activity
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
