'use client';

import {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/lib/types/speech';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useMemo,
  useTransition,
  useSyncExternalStore,
} from 'react';
import {
  createActivity,
  deleteActivity,
  getActivities,
  type ActivityFormState,
} from '@/app/actions/activities';
import { improveText } from '@/app/actions/reports';
import { polishDictation } from '@/app/actions/dictation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, ChevronDown, Trash2 } from 'lucide-react';

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import confetti from 'canvas-confetti';
import { useSettings } from '@/components/providers/settings-provider';
import { toast } from 'sonner';
import { QuickCaptureView } from '@/components/dashboard/quick-capture-view';
import {
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';

const initialState: ActivityFormState = {
  success: false,
  message: '',
};

const confettiColors = ['#d4a574', '#c49a6c', '#e0a458', '#f5f0e8', '#a89888'];

const subscribeToMount = () => () => {};
const getServerMountState = () => false;
const getClientMountState = () => true;

function useMounted() {
  return useSyncExternalStore(subscribeToMount, getClientMountState, getServerMountState);
}

function getSelectedDateLabel(date: Date): string {
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';
  return `on ${format(date, 'MMM d')}`;
}

function createSpeechRecognition(callbacks: {
  onStart: () => void;
  onFinalTranscript: (transcript: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}): SpeechRecognition {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onstart = callbacks.onStart;
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
    }
    if (finalTranscript) callbacks.onFinalTranscript(finalTranscript);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error !== 'no-speech') callbacks.onError(event.error);
  };
  recognition.onend = callbacks.onEnd;
  return recognition;
}

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

  const handleDemoSubmit = async (formData: FormData) => {
    if (!content && !formData.get('content')) return;

    setContent('');
    setSelectedDate(new Date());
    triggerConfetti();
    toast.success('Activity captured (Demo Mode)');
  };

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Keep a ref to the current date to avoid stale closure issues with useActionState
  const selectedDateRef = useRef<Date>(selectedDate);
  selectedDateRef.current = selectedDate;

  // Wrapper action that ensures the logDate is set correctly from the ref
  const wrappedFormAction = async (formData: FormData) => {
    // Ensure the logDate in formData reflects the current selectedDate
    formData.set('logDate', format(selectedDateRef.current, 'yyyy-MM-dd'));
    return formAction(formData);
  };

  const currentAction = demoMode
    ? (payload: FormData) => handleDemoSubmit(payload)
    : wrappedFormAction;
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Writing enhancement state
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

  // Handle text selection for writing enhancement
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

  // Handle a deterministic writing improvement
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
      recognitionRef.current?.stop();
      setIsListening(false);
      handleDictationPolish();
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Please try Chrome or Edge.');
      return;
    }

    const recognition = createSpeechRecognition({
      onStart: () => setIsListening(true),
      onFinalTranscript: transcript => {
        setContent(prev => {
          const needsSpace = prev.length > 0 && !prev.endsWith(' ');
          return prev + (needsSpace ? ' ' : '') + transcript;
        });
      },
      onError: error => {
        console.error('Speech recognition error', error);
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
    recognitionRef.current = recognition;
    recognition.start();
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
    <QuickCaptureView
      formRef={formRef}
      containerRef={containerRef}
      textareaRef={textareaRef}
      currentAction={currentAction}
      isPending={isPending}
      content={content}
      selection={selection}
      menuPosition={menuPosition}
      instruction={instruction}
      isImproving={isImproving}
      isPolishing={isPolishing}
      isListening={isListening}
      charCount={charCount}
      isValidLength={isValidLength}
      isMac={isMac}
      todayCount={todayCount}
      dailyGoal={dailyGoal}
      projects={projects}
      visibleProjects={visibleProjects}
      selectedProject={selectedProject}
      selectedDate={selectedDate}
      datePickerOpen={datePickerOpen}
      state={state}
      dateLabel={getDateLabel()}
      onContentChange={value => {
        setContent(value);
        if (selection) {
          setSelection(null);
          setMenuPosition(null);
        }
      }}
      onSelectionChange={setSelection}
      onMenuPositionChange={setMenuPosition}
      onInstructionChange={setInstruction}
      onDatePickerOpenChange={setDatePickerOpen}
      onDateChange={date => {
        if (date) {
          setSelectedDate(date);
          setDatePickerOpen(false);
        }
      }}
      onProjectChange={setSelectedProject}
      onSelect={handleSelect}
      onImprove={handleImprove}
      onDismissToolbar={dismissToolbar}
      onToggleListening={toggleListening}
    />
  );
}

type Activity = Awaited<ReturnType<typeof getActivities>>[number];

interface ActivityTimelineProps {
  activities: Activity[];
  totalCount?: number;
  initialTimeZone?: string;
}

const PAGE_SIZE = 20;

export function ActivityTimeline({
  activities: initialActivities,
  totalCount,
  initialTimeZone,
}: ActivityTimelineProps) {
  const { settings } = useSettings();
  let timeZone = DEFAULT_TIME_ZONE;
  if (settings?.timeZone && isValidTimeZone(settings.timeZone)) {
    timeZone = settings.timeZone;
  } else if (initialTimeZone && isValidTimeZone(initialTimeZone)) {
    timeZone = initialTimeZone;
  }
  const mounted = useMounted();
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

  const groupedActivities = groupByDate(visibleActivities, timeZone);

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in space-y-8 duration-500">
        {groupedActivities.map(({ dateKey, activities: dateActivities }) => (
          <div key={dateKey}>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                {formatDateHeader(dateKey, timeZone)}
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
                  timeZone={timeZone}
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
  timeZone: string;
  onOptimisticDelete: () => void;
  onUndoDelete: () => void;
}

function ActivityCard({ activity, timeZone, onOptimisticDelete, onUndoDelete }: ActivityCardProps) {
  const logDateYMD = getLogDateYMD(activity.logDate);
  const createdAtYMD = getCreatedAtLocalYMD(activity.createdAt, timeZone);

  return (
    <Card className="bg-card/40 border-border/40 group hover:bg-card/60 hover:shadow-primary/5 rounded-xl transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-foreground leading-relaxed break-all whitespace-pre-wrap">
              {activity.content}
            </p>

            <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
              {logDateYMD !== createdAtYMD && (
                <span className="font-medium text-amber-500">
                  For {format(parseLocalYMD(logDateYMD), 'MMM d')}
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

function groupByDate(
  activities: Activity[],
  timeZone: string
): { dateKey: string; activities: Activity[] }[] {
  const groups: Record<string, Activity[]> = {};

  activities.forEach(activity => {
    const dateKey = getCreatedAtLocalYMD(activity.createdAt, timeZone);
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

function getCreatedAtLocalYMD(date: string | Date, timeZone: string): string {
  const d = new Date(date);
  return getCalendarDate(d, timeZone);
}

function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeader(dateKey: string, timeZone: string): string {
  const date = parseLocalYMD(dateKey);
  const today = getCalendarDate(new Date(), timeZone);

  if (dateKey === today) {
    return 'Today';
  }
  if (dateKey === shiftCalendarDate(today, -1)) {
    return 'Yesterday';
  }

  return format(date, 'EEEE, MMMM d');
}
