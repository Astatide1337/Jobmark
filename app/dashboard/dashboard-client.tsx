'use client';

import {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/lib/types/speech';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { createActivity, type ActivityFormState } from '@/app/actions/activities';
import { polishDictation } from '@/app/actions/dictation';

import { format } from 'date-fns';
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
  initialDate?: string;
  initialTimeZone?: string;
}

export function QuickCapture({
  projects = [],
  todayCount = 0,
  dailyGoal = 3,
  demoMode = false,
  initialDate,
  initialTimeZone,
}: QuickCaptureProps) {
  const { settings } = useSettings();
  let timeZone = DEFAULT_TIME_ZONE;
  if (settings?.timeZone && isValidTimeZone(settings.timeZone)) {
    timeZone = settings.timeZone;
  } else if (initialTimeZone && isValidTimeZone(initialTimeZone)) {
    timeZone = initialTimeZone;
  }
  const todayKey = initialDate ?? getCalendarDate(new Date(), timeZone);
  const initialDateValue = useMemo(() => parseCalendarDate(todayKey), [todayKey]);
  const [state, formAction, isPending] = useActionState(createActivity, initialState);
  const [content, setContent] = useState('');

  const handleDemoSubmit = async (formData: FormData) => {
    if (!content && !formData.get('content')) return;

    setContent('');
    setSelectedDate(initialDateValue);
    triggerConfetti();
    toast.success('Note added (demo)');
  };

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(initialDateValue);

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
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (state.success) {
      setContent('');
      setSelectedDate(initialDateValue); // Reset to the server's calendar today

      // Only trigger confetti if setting is enabled (default true)
      if (settings?.showConfetti !== false) {
        triggerConfetti();
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [initialDateValue, state, settings?.showConfetti]);

  const charCount = content.length;
  const isValidLength = charCount >= 10 && charCount <= 1000;

  // Get formatted date label
  const getDateLabel = () => {
    const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
    if (selectedDateKey === todayKey) return 'Today';
    if (selectedDateKey === shiftCalendarDate(todayKey, -1)) return 'Yesterday';
    return format(parseCalendarDate(selectedDateKey), 'MMM d');
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

  // Dictation Logic
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      handleDictationPolish();
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Try Chrome or Edge.');
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

  return (
    <QuickCaptureView
      formRef={formRef}
      textareaRef={textareaRef}
      currentAction={currentAction}
      isPending={isPending}
      content={content}
      isPolishing={isPolishing}
      isListening={isListening}
      charCount={charCount}
      isValidLength={isValidLength}
      todayCount={todayCount}
      dailyGoal={dailyGoal}
      projects={projects}
      visibleProjects={visibleProjects}
      selectedProject={selectedProject}
      selectedDate={selectedDate}
      maxDate={initialDateValue}
      datePickerOpen={datePickerOpen}
      state={state}
      dateLabel={getDateLabel()}
      onContentChange={value => {
        setContent(value);
      }}
      onDatePickerOpenChange={setDatePickerOpen}
      onDateChange={date => {
        if (date) {
          setSelectedDate(date);
          setDatePickerOpen(false);
        }
      }}
      onProjectChange={setSelectedProject}
      onToggleListening={toggleListening}
    />
  );
}

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
