'use client';

import {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/lib/types/speech';
import { useActionState, useEffect, useRef, useState, useMemo, useTransition } from 'react';
import {
  createActivity,
  deleteActivity,
  getActivities,
  type ActivityFormState,
} from '@/app/actions/activities';
import { improveText } from '@/app/actions/reports';
import { polishDictation } from '@/app/actions/dictation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DictateButton } from '@/components/ui/dictate-button';
import {
  Check,
  Loader2,
  Send,
  CalendarIcon,
  Sparkles,
  ArrowUp,
  X,
  FileText,
  ChevronDown,
  FolderOpen,
  Trash2,
  Target,
  Quote,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';

import { format, formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useSettings } from '@/components/providers/settings-provider';
import { toast } from 'sonner';
import Link from 'next/link';
import type { GoalData } from '@/app/actions/goals';
import type { UserSettingsData } from '@/app/actions/settings';

const initialState: ActivityFormState = {
  success: false,
  message: '',
};

const confettiColors = ['#d4a574', '#c49a6c', '#e0a458', '#f5f0e8', '#a89888'];

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

export function QuickCapture({
  projects = [],
  todayCount = 0,
  dailyGoal = 3,
  demoMode = false,
}: QuickCaptureProps) {
  const { settings } = useSettings();
  const [state, formAction, isPending] = useActionState(createActivity, initialState);
  const [content, setContent] = useState('');
  // ... other state

  // Demo Submission Logic
  const handleDemoSubmit = async (formData: FormData) => {
    if (!content && !formData.get('content')) return;

    setContent('');
    setSelectedDate(new Date());
    triggerConfetti();
    toast.success('Activity captured (Demo Mode)');
  };

  const currentAction = demoMode ? (payload: FormData) => handleDemoSubmit(payload) : formAction;

  // ... (rest of component)
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // AI Enhancement state
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null
  );
  const [instruction, setInstruction] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Dictation state
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Filter projects based on hideArchived setting
  const visibleProjects = useMemo(() => {
    if (settings?.hideArchived) {
      return projects.filter(p => !p.archived);
    }
    return projects;
  }, [projects, settings?.hideArchived]);

  // Detect OS on mount
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'));
  }, []);

  useEffect(() => {
    if (state.success) {
      setContent('');
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
    if (isToday(selectedDate)) return 'Today';
    if (isYesterday(selectedDate)) return 'Yesterday';
    return format(selectedDate, 'MMM d');
  };

  // Global keyboard listener for Ctrl/Cmd + Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValidLength && !isPending) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
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
        setInstruction('');
        setMenuPosition(null);
      }
    } catch (error) {
      console.error('Improvement failed', error);
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
      if (!('webkitSpeechRecognition' in window)) {
        alert('Your browser does not support speech recognition. Please try Chrome or Edge.');
        return;
      }

      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

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
              const needsSpace = prev.length > 0 && !prev.endsWith(' ');
              return prev + (needsSpace ? ' ' : '') + finalTranscript;
            });
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          // Ignore no-speech error as it just means the user didn't speak instantly.
          // We can optionally restart or just let it be.
          // In continuous mode, some browsers stop.
          return;
        }
        console.error('Speech recognition error', event.error);
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
    setInstruction('');
    setMenuPosition(null);
  };

  return (
    <Card className="bg-card border-border/50 warm-glow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Capture to Record</CardTitle>
          <span
            className={`rounded-xl px-2.5 py-1 text-xs font-medium ${
              todayCount >= dailyGoal
                ? 'bg-green-500/20 text-green-400'
                : 'bg-primary/20 text-primary'
            }`}
          >
            {isListening ? (
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                Recording...
              </span>
            ) : (
              `${todayCount}/${dailyGoal} today`
            )}
          </span>
        </div>
        <CardDescription>
          What work should be part of your record{' '}
          {isToday(selectedDate)
            ? 'today'
            : isYesterday(selectedDate)
              ? 'yesterday'
              : `on ${format(selectedDate, 'MMM d')}`}
          ?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={currentAction}>
          <div className="space-y-4">
            {/* Textarea with selection highlight (Mirrored from LiveEditor) */}
            <div className="group relative">
              {/* Ref for container to calculate positions */}
              <div ref={containerRef} className="relative w-full">
                {/* 1. Backdrop Highlight Layer */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 z-0 break-words whitespace-pre-wrap text-transparent',
                    'min-h-[100px] w-full rounded-xl border border-transparent px-3 py-2 text-sm', // Match Textarea styles
                    'bg-transparent'
                  )}
                >
                  {selection ? (
                    <>
                      {content.substring(0, selection.start)}
                      <span
                        ref={el => {
                          // We need to capture this ref to calculate position
                          if (el && !menuPosition) {
                            const container = textareaRef.current;
                            if (container) {
                              const spanRect = el.getBoundingClientRect();
                              const containerRect = container.getBoundingClientRect();
                              const top = spanRect.bottom - containerRect.top;
                              const left = spanRect.left - containerRect.left + spanRect.width / 2;
                              setMenuPosition({ top, left });
                            }
                          }
                        }}
                        className="bg-primary/20 rounded-[2px] text-transparent"
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
                  onChange={e => {
                    setContent(e.target.value);
                    // Clear selection on edit
                    if (selection) {
                      setSelection(null);
                      setMenuPosition(null);
                    }
                  }}
                  onSelect={handleSelect}
                  placeholder="Shipped the dashboard polish, reviewed two PRs, and clarified scope for the API work."
                  className="border-border/50 focus:bg-background/50 relative z-10 min-h-[100px] resize-none bg-transparent pr-16 transition-colors"
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
                  <div className="absolute right-2 bottom-2 z-30">
                    <div className="bg-background/80 border-border/50 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Polishing...
                    </div>
                  </div>
                )}
              </div>

              <div className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 z-20 text-xs">
                <span className={charCount < 10 ? 'text-destructive' : ''}>{charCount}</span>
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
                      transform: 'translateX(-50%)',
                    }}
                    className="absolute z-50 flex origin-top flex-col items-center bg-transparent"
                  >
                    {/* Arrow pointer */}
                    <div className="border-b-popover absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-l-transparent drop-shadow-sm" />

                    <div className="bg-popover border-border flex w-[340px] items-center gap-2 rounded-xl border p-1 shadow-xl">
                      <div className="bg-primary/10 text-primary ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <Input
                        value={instruction}
                        onChange={e => setInstruction(e.target.value)}
                        placeholder="Enhance: 'make it professional'"
                        className="h-9 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImprove();
                          }
                          if (e.key === 'Escape') dismissToolbar();
                        }}
                        autoFocus
                      />

                      <div className="flex items-center gap-1 border-l pr-1 pl-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Enhance with AI"
                          className={cn(
                            'hover:bg-primary/10 hover:text-primary h-8 w-8',
                            instruction && 'text-primary'
                          )}
                          onClick={handleImprove}
                          disabled={!instruction || isImproving}
                        >
                          {isImproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Close AI Toolbar"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/40 h-8 w-8 transition-all active:scale-90"
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

            <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">
              <p>Good entries are short and specific.</p>
              <p>Try: shipped, resolved, reviewed, coordinated, decided.</p>
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
                      'text-muted-foreground flex items-center gap-2 rounded-xl border px-3 py-2 transition-all',
                      'bg-background/50 hover:bg-muted/40 hover:text-primary',
                      datePickerOpen
                        ? 'border-primary/50 ring-primary/20 text-foreground ring-2'
                        : 'border-border/50 hover:border-primary/20'
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
                    onSelect={date => {
                      if (date) {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    disabled={date => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="bg-border/50 mx-1 h-6 w-px" />

              <DictateButton
                isListening={isListening}
                isPolishing={isPolishing}
                onClick={toggleListening}
                disabled={isPending}
              />
            </div>

            {state.errors?.content && (
              <p className="text-destructive text-sm">
                {state.errors.content[0]} Add one concrete action or outcome so this entry is useful later.
              </p>
            )}

            {!state.success && state.message && !state.errors && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                <kbd className="bg-muted border-border/50 rounded-md border px-1.5 py-0.5 text-[10px]">
                  {isMac ? '⌘' : 'Ctrl'}
                </kbd>
                {' + '}
                <kbd className="bg-muted border-border/50 rounded-md border px-1.5 py-0.5 text-[10px]">
                  Enter
                </kbd>
                {' to save to your record'}
              </p>

              {/* Send selected date */}
              <input type="hidden" name="logDate" value={format(selectedDate, 'yyyy-MM-dd')} />

              <Button
                type="submit"
                disabled={!isValidLength || isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Save to Record
                  </>
                )}
              </Button>
            </div>

            {state.success && (
              <div className="border-border/50 bg-background/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">Added to your record.</p>
                  <p className="text-muted-foreground text-xs">
                    Keep capturing, assign this work to a project, or turn the week into a summary.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => textareaRef.current?.focus()}
                  >
                    Add Another
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/projects?new=true">Create Project</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/reports?tab=new">Generate Summary</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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
      title: 'Log your first activity',
      done: activityCount > 0,
      href: '/dashboard',
      cta: 'Start capturing',
    },
    {
      title: 'Create your first project',
      done: projectCount > 0,
      href: '/projects?new=true',
      cta: 'Create project',
    },
    {
      title: 'Generate your first weekly summary',
      done: summaryCount > 0,
      href: '/reports?tab=new',
      cta: 'Build summary',
    },
  ];

  return (
    <Card className="border-border/50 bg-card/60 mb-8 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">How Jobmark works</CardTitle>
        <CardDescription>
          Capture the work, organize it into evidence, and reuse it when reviews or updates matter.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {steps.map(step => (
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
                {step.done ? <Check className="h-3.5 w-3.5" /> : steps.indexOf(step) + 1}
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

export function NextBestAction({
  activityCount,
  projectCount,
  summaryCount,
}: {
  activityCount: number;
  projectCount: number;
  summaryCount: number;
}) {
  const suggestion =
    activityCount === 0
      ? {
          title: 'Start by capturing one concrete piece of work.',
          body: 'A short, specific entry is enough to begin building a useful record.',
          href: '/dashboard',
          cta: 'Capture Work',
        }
      : projectCount === 0
        ? {
            title: 'Create a project so your evidence stays organized.',
            body: 'Projects help turn scattered entries into review-ready material.',
            href: '/projects?new=true',
            cta: 'Create Project',
          }
        : summaryCount === 0
          ? {
              title: 'Turn recent work into your first reusable summary.',
              body: 'A draft summary makes weekly updates and reviews much easier later.',
              href: '/reports?tab=new',
              cta: 'Build Summary',
            }
          : {
              title: 'Use your record to prepare the next move.',
              body: 'Review your summaries, then use the coach or insights to sharpen the story.',
              href: '/chat',
              cta: 'Open Coach',
            };

  return (
    <Card className="border-border/50 bg-card/60 rounded-2xl">
      <CardContent className="flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">
            Next Best Action
          </p>
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

type Activity = Awaited<ReturnType<typeof getActivities>>[number];

interface ActivityTimelineProps {
  activities: Activity[];
  totalCount?: number;
}

const PAGE_SIZE = 20;

export function ActivityTimeline({
  activities: initialActivities,
  totalCount,
}: ActivityTimelineProps) {
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [hasMore, setHasMore] = useState(
    totalCount ? initialActivities.length < totalCount : initialActivities.length === PAGE_SIZE
  );

  // Sync state with props when they change (during render phase to avoid cascading effects)
  const [prevInitialActivities, setPrevInitialActivities] = useState(initialActivities);
  if (initialActivities !== prevInitialActivities) {
    setActivities(initialActivities);
    setPrevInitialActivities(initialActivities);
    setDeletedIds(new Set());
    setHasMore(
      totalCount ? initialActivities.length < totalCount : initialActivities.length === PAGE_SIZE
    );
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleActivities = activities.filter(a => !deletedIds.has(a.id));

  const handleOptimisticDelete = (id: string) => {
    setDeletedIds(prev => new Set(prev).add(id));
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleLoadMore = () => {
    startLoadingMore(async () => {
      const moreActivities = await getActivities(PAGE_SIZE, activities.length);
      if (moreActivities.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setActivities(prev => [...prev, ...moreActivities]);
    });
  };

  if (visibleActivities.length === 0 && !isLoadingMore) {
    return <TimelineEmptyState />;
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card/50 border-border/50 animate-pulse opacity-50">
            <CardContent className="h-24 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const groupedActivities = groupByDate(visibleActivities);

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in space-y-8 duration-500">
        {groupedActivities.map(({ dateKey, activities: dateActivities }) => (
          <div key={dateKey}>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                {formatDateHeader(dateKey)}
              </h3>
              <div className="bg-border/50 h-px flex-1" />
              <span className="text-muted-foreground text-xs">
                {dateActivities.length} {dateActivities.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div className="space-y-3">
              {dateActivities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onOptimisticDelete={() => handleOptimisticDelete(activity.id)}
                  onUndoDelete={() => handleUndoDelete(activity.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="text-muted-foreground hover:text-primary group flex w-full flex-col items-center gap-2 py-6 transition-all active:scale-95"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-border/50 group-hover:bg-primary/30 h-px w-12 transition-colors" />
                <span className="text-xs font-medium tracking-wider uppercase">Load More</span>
                <div className="bg-border/50 group-hover:bg-primary/30 h-px w-12 transition-colors" />
              </div>

              <ChevronDown className="h-4 w-4 animate-bounce opacity-50 transition-opacity group-hover:opacity-100" />
            </>
          )}
        </button>
      )}

      {visibleActivities.length > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing {visibleActivities.length}{' '}
          {visibleActivities.length === 1 ? 'activity' : 'activities'}
          {totalCount && totalCount > visibleActivities.length && ` of ${totalCount}`}
        </p>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  onOptimisticDelete: () => void;
  onUndoDelete: () => void;
}

function ActivityCard({ activity, onOptimisticDelete, onUndoDelete }: ActivityCardProps) {
  return (
    <Card className="bg-card/40 border-border/40 group hover:bg-card/60 hover:shadow-primary/5 rounded-xl transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-foreground leading-relaxed break-all whitespace-pre-wrap">
              {activity.content}
            </p>

            <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
              {getLogDateYMD(activity.logDate) !== getCreatedAtLocalYMD(activity.createdAt) && (
                <span className="font-medium text-amber-500">
                  For {format(parseLocalYMD(getLogDateYMD(activity.logDate)), 'MMM d')}
                </span>
              )}

              <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>

              {activity.project && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: activity.project.color }}
                    />
                    {activity.project.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <DeleteActivityButton
            activityId={activity.id}
            onOptimisticDelete={onOptimisticDelete}
            onUndoDelete={onUndoDelete}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface DeleteActivityButtonProps {
  activityId: string;
  onOptimisticDelete?: () => void;
  onUndoDelete?: () => void;
}

function DeleteActivityButton({
  activityId,
  onOptimisticDelete,
  onUndoDelete,
}: DeleteActivityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDelete = () => {
    onOptimisticDelete?.();

    toast('Activity deleted', {
      description: 'This action will be permanent in 5 seconds',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
          }
          onUndoDelete?.();
          toast.success('Activity restored');
        },
      },
    });

    deleteTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        await deleteActivity(activityId);
      });
    }, 5000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function TimelineEmptyState() {
  return (
    <Card className="bg-card/40 border-border/40 rounded-2xl border-dashed">
      <CardContent className="py-12 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
          <FileText className="text-primary h-6 w-6" />
        </div>
        <h3 className="text-foreground mb-2 font-semibold">No activities yet</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          Capture one concrete action so your record has something real to build on.
        </p>
      </CardContent>
    </Card>
  );
}

function groupByDate(activities: Activity[]): { dateKey: string; activities: Activity[] }[] {
  const groups: Record<string, Activity[]> = {};

  activities.forEach(activity => {
    const dateKey = getCreatedAtLocalYMD(activity.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupActivities]) => ({
      dateKey,
      activities: groupActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
}

function getLogDateYMD(date: string | Date): string {
  if (typeof date === 'string') {
    return date.substring(0, 10);
  }
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

function getCreatedAtLocalYMD(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-CA');
}

function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeader(dateKey: string): string {
  const date = parseLocalYMD(dateKey);

  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'EEEE, MMMM d');
}

interface GoalMotivatorProps {
  goals: GoalData[];
  settings: UserSettingsData | null;
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
            <h3 className="text-lg font-semibold">No goals set yet</h3>
            <p className="text-muted-foreground text-sm">
              Goals help connect daily evidence to the direction you want to move in.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <PlusCircle className="mr-2 h-4 w-4" />
              Set a Goal
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
                <span>Primary Goal</span>
              </div>
              <h3 className="text-foreground/90 text-xl font-bold tracking-tight md:text-2xl">
                {settings.primaryGoal}
              </h3>
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
                  Days Left
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
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: shouldReduceMotion ? 0 : dir < 0 ? 1000 : -1000,
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
                  <span>
                    Current Goal {goals.length > 1 && `(${currentIndex + 1}/${goals.length})`}
                  </span>
                </div>
                <h3 className="text-foreground/90 line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
                  {currentGoal.title}
                </h3>
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
                  Days Left
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

function ProjectChipSelector({ projects, selectedId, onSelect }: ProjectChipSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedId);

  if (projects.length === 0) {
    return null;
  }

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
