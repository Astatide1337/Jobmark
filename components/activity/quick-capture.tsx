"use client";

import { useActionState, useEffect, useRef, useState, useMemo } from "react";
import { createActivity, type ActivityFormState } from "@/app/actions/activities";
import { improveText } from "@/app/actions/reports";
import { polishDictation } from "@/app/actions/dictation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ProjectChipSelector } from "@/components/projects/project-chip-selector";
import { DictateButton } from "@/components/ui/dictate-button";
import { Loader2, Send, CalendarIcon, Sparkles, ArrowUp, X, Mic, MicOff, Wand2 } from "lucide-react";

import { format, isToday, isYesterday, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useSettings } from "@/components/providers/settings-provider";
import { toast } from "sonner";

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

// ... imports

interface QuickCaptureProps {
  projects?: Project[];
  todayCount?: number;
  dailyGoal?: number;
  demoMode?: boolean;
}

export function QuickCapture({ projects = [], todayCount = 0, dailyGoal = 3, demoMode = false }: QuickCaptureProps) {
  const { settings } = useSettings();
  const [state, formAction, isPending] = useActionState(createActivity, initialState);
  const [content, setContent] = useState("");
  // ... other state

  // Demo Submission Logic
  const handleDemoSubmit = async (formData: FormData) => {
    if (!content && !formData.get("content")) return;
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    
    setContent("");
    setSelectedDate(new Date());
    triggerConfetti();
    toast.success("Activity captured (Demo Mode)");
  };

  const currentAction = demoMode ? (payload: FormData) => handleDemoSubmit(payload) : formAction;

  // ... (rest of component)
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

  // Dictation state
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const recognitionRef = useRef<any>(null); // Type 'any' because SpeechRecognition is not standard TS yet

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



  // Dictation Logic
  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      handleDictationPolish();
    } else {
      // Start listening
      if (!("webkitSpeechRecognition" in window)) {
        alert("Your browser does not support speech recognition. Please try Chrome or Edge.");
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Determine where to append. If we just started, we append.
        // For simplicity in this v1, raw dictation appends to existing content.
        // We'll trust the user to manage cursor or we just append to end.
        if (finalTranscript || interimTranscript) {
          // Note: In a real "draft" mode we might want to keep the "interim" separate visually
          // But for now, let's just update the content.
          // However, updating state on every interim keyframe might be jittery if we don't handle it carefully.
          // Let's just create a combined view.
          // Actually, standard behavior:
          // Keep track of what was there BEFORE dictation started?
          // For now, let's just append final results to content, and show interim in a separate ephemeral UI?
          // No, user wants "words populate".
          
          // Strategy: Update content with (Existing + Final + Interim)
          // Ideally we need to know the insertion point, but appending to end is safest for QuickCapture.
           
           // A better approach for React controlled input:
           // We can't easily mix "typed" content with "streamed" content in the same state variable without cursor jumping.
           // Recommendation: Just append final results. Show interim in a preview bubble?
           // OR: Just append everything.
           
           if (finalTranscript) {
             setContent(prev => {
                const needsSpace = prev.length > 0 && !prev.endsWith(" ");
                return prev + (needsSpace ? " " : "") + finalTranscript;
             });
           }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
            // Ignore no-speech error as it just means the user didn't speak instantly.
            // We can optionally restart or just let it be. 
            // In continuous mode, some browsers stop.
            return;
        }
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // We don't auto-polish on simple end, because it might be a pause.
        // We only polish when user explicitly toggles OFF.
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleDictationPolish = async () => {
    // Only polish if there's enough text and it looks "raw" (simple heuristic or user action)
    // Actually, usually we polish only the RECENTLY dictated part.
    // For this simple implementation, let's polish the WHOLE text or just the new part?
    // "polishDictation" polishes the given string.
    // If we polish the whole textarea, it might change things user intentionally wrote.
    // Let's offer a "Magic Wand" polish button for the whole text, 
    // AND auto-polish the last session? Auto-polish is riskier.
    // Let's implemented a explicit "Magic Polish" after dictation stops.
    
    // Changing strategy slightly: 
    // User dictates -> Words appear. 
    // User stops -> Words stay.
    // User clicks "Polish" (or we trigger it and Replace).
    
    if (!content.trim()) return;
    
    setIsPolishing(true);
    try {
        const polished = await polishDictation(content);
        if (polished) setContent(polished);
    } catch (e) {
        console.error(e);
    } finally {
        setIsPolishing(false);
    }
  };

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
          <span className={`text-xs px-2.5 py-1 rounded-xl font-medium ${
            todayCount >= dailyGoal 
              ? "bg-green-500/20 text-green-400" 
              : "bg-primary/20 text-primary"
          }`}>
             {isListening ? (
                <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Recording...
                </span>
             ) : (
                `${todayCount}/${dailyGoal} today`
             )}
          </span>
        </div>
        <CardDescription>
          What did you accomplish {isToday(selectedDate) ? "today" : isYesterday(selectedDate) ? "yesterday" : `on ${format(selectedDate, "MMM d")}`}?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={currentAction}>
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
                    "min-h-[100px] w-full rounded-xl border border-transparent px-3 py-2 text-sm", // Match Textarea styles
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

                {/* Dictation Polish Overlay/Button */}
                {/* Dictation Polish Overlay/Button */}
                {isPolishing && (
                    <div className="absolute bottom-2 right-2 z-30">
                        <div className="bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2">
                            <Sparkles className="h-3 w-3 animate-pulse" />
                            Polishing...
                        </div>
                    </div>
                )}

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
                          aria-label="Enhance with AI"
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
                          aria-label="Close AI Toolbar"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-90"
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
                      "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-muted-foreground",
                      "bg-background/50 hover:bg-muted/40 hover:text-primary",
                      datePickerOpen 
                        ? "border-primary/50 ring-2 ring-primary/20 text-foreground" 
                        : "border-border/50 hover:border-primary/20"
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

              <div className="h-6 w-px bg-border/50 mx-1" />

              <DictateButton
                isListening={isListening}
                isPolishing={isPolishing}
                onClick={toggleListening}
                disabled={isPending}
              />

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
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded-md border border-border/50">{isMac ? "⌘" : "Ctrl"}</kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded-md border border-border/50">Enter</kbd>
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
