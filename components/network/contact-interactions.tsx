'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DictateButton } from '@/components/ui/dictate-button';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { createInteraction, deleteInteraction } from '@/app/actions/network';
import { polishDictation } from '@/app/actions/dictation';
import { toast } from 'sonner';
import {
  CHANNEL_OPTIONS,
  formatDate,
  getChannelLabel,
  getRelativeDay,
  isDateOnlyOverdue,
} from '@/lib/network';
import { cn } from '@/lib/utils';

export interface Interaction {
  id: string;
  contactId: string;
  occurredAt: Date;
  channel: string;
  summary: string;
  nextStep?: string | null;
  followUpDate?: Date | null;
  rawNotes?: string | null;
  createdAt: Date;
}

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-info/15 text-info',
  call: 'bg-success/15 text-success',
  text: 'bg-primary/15 text-primary',
  'in-person': 'bg-warning/15 text-warning',
  linkedin: 'bg-info/15 text-info',
  video: 'bg-accent/15 text-accent-foreground',
  other: 'bg-muted text-muted-foreground',
};

export function InteractionTimeline({
  interactions,
  contactId,
  timeZone,
  onInteractionAdded,
}: {
  interactions: Interaction[];
  contactId: string;
  timeZone: string;
  onInteractionAdded?: () => void;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedRawNotes, setExpandedRawNotes] = useState<Set<string>>(() => new Set());

  const handleDelete = async (interactionId: string) => {
    setDeletingId(interactionId);
    try {
      const result = await deleteInteraction(interactionId);
      if (result.success) {
        toast.success('Conversation deleted.');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Delete interaction error:', error);
      toast.error('Could not delete the conversation.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    onInteractionAdded?.();
  };

  const toggleRawNotes = (interactionId: string) => {
    setExpandedRawNotes(prev => {
      const next = new Set(prev);
      if (next.has(interactionId)) next.delete(interactionId);
      else next.add(interactionId);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'outline' : 'default'}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add conversation
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <InteractionLogForm
            contactId={contactId}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}

        {interactions.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="text-muted-foreground/50 mx-auto mb-3 h-8 w-8" />
            <p className="text-foreground text-sm font-medium">No conversations yet.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Save short notes about conversations and follow-ups.
            </p>
            {!showForm && (
              <Button variant="link" size="sm" className="mt-2" onClick={() => setShowForm(true)}>
                Add your first conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="relative space-y-0">
            <div className="bg-border absolute top-2 bottom-2 left-4 w-px" />
            {interactions.map(interaction => (
              <div key={interaction.id} className="group relative pb-6 pl-10 last:pb-0">
                <div className="bg-primary ring-background absolute top-1.5 left-[11px] h-2.5 w-2.5 rounded-xl ring-2" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-0 text-xs',
                        CHANNEL_COLORS[interaction.channel] ?? CHANNEL_COLORS.other
                      )}
                    >
                      {getChannelLabel(interaction.channel)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(interaction.occurredAt)}
                    </span>
                    <div className="ml-auto opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {confirmDeleteId === interaction.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleDelete(interaction.id)}
                            disabled={deletingId === interaction.id}
                          >
                            {deletingId === interaction.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete conversation from ${formatDate(interaction.occurredAt)}`}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-6 w-6 p-0 transition-[color,background-color]"
                          onClick={() => setConfirmDeleteId(interaction.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm whitespace-pre-wrap">{interaction.summary}</p>

                  {interaction.nextStep && (
                    <div className="text-muted-foreground text-sm">
                      <span className="text-foreground font-medium">Next step:</span>{' '}
                      {interaction.nextStep}
                    </div>
                  )}

                  {interaction.rawNotes && interaction.rawNotes.trim().length > 0 && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary h-7 px-2 text-xs transition-colors"
                        onClick={() => toggleRawNotes(interaction.id)}
                      >
                        <ChevronDown
                          className={cn(
                            'mr-1 h-3.5 w-3.5 transition-transform',
                            expandedRawNotes.has(interaction.id) && 'rotate-180'
                          )}
                        />
                        {expandedRawNotes.has(interaction.id)
                          ? 'Hide additional notes'
                          : 'View additional notes'}
                      </Button>

                      {expandedRawNotes.has(interaction.id) && (
                        <div className="animate-in zoom-in-95 fade-in bg-muted/30 mt-2 rounded-xl border p-3 shadow-sm duration-200">
                          <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                            {interaction.rawNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {interaction.followUpDate && (
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        isDateOnlyOverdue(interaction.followUpDate, timeZone)
                          ? 'text-destructive font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Follow up on {formatDate(interaction.followUpDate)} (
                        {getRelativeDay(interaction.followUpDate, timeZone)})
                      </span>
                      {isDateOnlyOverdue(interaction.followUpDate, timeZone) && (
                        <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InteractionLogForm({
  contactId,
  onSuccess,
  onCancel,
}: {
  contactId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRawNotes, setShowRawNotes] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [activeField, setActiveField] = useState<'summary' | 'nextStep' | null>(null);

  type SpeechRecognitionResultLike = { transcript: string };
  type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: ArrayLike<ArrayLike<SpeechRecognitionResultLike> & { isFinal: boolean }>;
  };
  type SpeechRecognitionErrorEventLike = { error: string };
  type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
  };

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [channel, setChannel] = useState('other');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(today);
  const [nextStep, setNextStep] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [occurredPickerOpen, setOccurredPickerOpen] = useState(false);
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);

  const ymdToLocalDate = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const todayLocalMidnight = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const getFieldValue = (field: 'summary' | 'nextStep') =>
    field === 'summary' ? summary : nextStep;
  const setFieldValue = (field: 'summary' | 'nextStep', value: string) => {
    if (field === 'summary') setSummary(value);
    else setNextStep(value);
  };

  const appendFinalTranscript = (field: 'summary' | 'nextStep', finalTranscript: string) => {
    const chunk = finalTranscript.trim();
    if (!chunk) return;
    const apply = (prev: string) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(' ');
      return prev + (needsSpace ? ' ' : '') + chunk;
    };
    if (field === 'summary') setSummary(apply);
    else setNextStep(apply);
  };

  const startListening = (field: 'summary' | 'nextStep') => {
    const SpeechRecognition = (
      window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    ).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice typing is not available in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = event => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
      }
      if (!finalTranscript) return;
      appendFinalTranscript(field, finalTranscript);
    };

    recognition.onerror = event => {
      if (event.error !== 'no-speech') {
        console.error('Dictation error:', event.error);
        toast.error('Voice typing failed. Try again.');
      }
      setIsListening(false);
      setActiveField(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveField(null);
    };

    recognitionRef.current = recognition;
    setActiveField(field);
    setIsListening(true);
    recognition.start();
  };

  const stopListening = async (field: 'summary' | 'nextStep') => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    const current = getFieldValue(field);
    if (!current.trim()) return;

    setIsPolishing(true);
    try {
      const polished = await polishDictation(current);
      if (polished && polished.trim().length > 0) {
        setFieldValue(field, polished);
      }
    } catch (error) {
      console.error('Voice typing cleanup error:', error);
    } finally {
      setIsPolishing(false);
    }
  };

  const toggleListening = async (field: 'summary' | 'nextStep') => {
    if (isLoading || isPolishing) return;
    if (isListening && activeField === field) {
      await stopListening(field);
      return;
    }
    if (isListening && activeField && activeField !== field) {
      await stopListening(activeField);
    }
    startListening(field);
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const resetForm = () => {
    setChannel('other');
    setSummary('');
    setOccurredAt(today);
    setNextStep('');
    setFollowUpDate('');
    setRawNotes('');
    setErrors({});
    setShowRawNotes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    try {
      const formData = new FormData();
      formData.append('contactId', contactId);
      formData.append('channel', channel);
      formData.append('summary', summary);
      formData.append('occurredAt', occurredAt);
      formData.append('nextStep', nextStep);
      formData.append('followUpDate', followUpDate);
      formData.append('rawNotes', rawNotes);

      const result = await createInteraction({ success: false, message: '' }, formData);
      if (result.success) {
        toast.success('Conversation saved.');
        resetForm();
        onSuccess?.();
      } else if (result.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(result.errors)) {
          if (msgs && msgs.length > 0) mapped[key] = msgs[0];
        }
        setErrors(mapped);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Conversation save error:', error);
      toast.error('Could not save the conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card/50 rounded-xl border p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interaction-channel">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="interaction-channel">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && <p className="text-destructive text-xs">{errors.channel}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="interaction-occurredAt">Date</Label>
            <Popover open={occurredPickerOpen} onOpenChange={setOccurredPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occurredAt ? format(ymdToLocalDate(occurredAt), 'LLL dd, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={occurredAt ? ymdToLocalDate(occurredAt) : undefined}
                  onSelect={date => {
                    if (!date) return;
                    setOccurredAt(format(date, 'yyyy-MM-dd'));
                    setOccurredPickerOpen(false);
                  }}
                  disabled={date => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d > todayLocalMidnight;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.occurredAt && <p className="text-destructive text-xs">{errors.occurredAt}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interaction-summary">
              What happened <span className="text-destructive">*</span>
            </Label>
            <DictateButton
              isListening={isListening && activeField === 'summary'}
              isPolishing={isPolishing && activeField === 'summary'}
              onClick={() => toggleListening('summary')}
              disabled={isLoading}
            />
          </div>
          <Textarea
            id="interaction-summary"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="What did you talk about?"
            className="h-20 resize-none"
          />
          {errors.summary && <p className="text-destructive text-xs">{errors.summary}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interaction-nextStep">Next step</Label>
            <DictateButton
              isListening={isListening && activeField === 'nextStep'}
              isPolishing={isPolishing && activeField === 'nextStep'}
              onClick={() => toggleListening('nextStep')}
              disabled={isLoading}
            />
          </div>
          <Textarea
            id="interaction-nextStep"
            value={nextStep}
            onChange={e => setNextStep(e.target.value)}
            placeholder="What needs to happen next?"
            className="h-16 resize-none"
          />
          {errors.nextStep && <p className="text-destructive text-xs">{errors.nextStep}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interaction-followUpDate">Follow-up date</Label>
          <div className="flex items-center gap-2">
            <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate
                    ? format(ymdToLocalDate(followUpDate), 'LLL dd, yyyy')
                    : 'Choose a follow-up date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followUpDate ? ymdToLocalDate(followUpDate) : undefined}
                  onSelect={date => {
                    if (!date) return;
                    setFollowUpDate(format(date, 'yyyy-MM-dd'));
                    setFollowUpPickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {followUpDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setFollowUpDate('')}
                disabled={isLoading || isPolishing}
              >
                Clear
              </Button>
            )}
          </div>
          {errors.followUpDate && <p className="text-destructive text-xs">{errors.followUpDate}</p>}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowRawNotes(!showRawNotes)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showRawNotes ? 'rotate-180' : ''}`}
            />
            Additional notes
          </button>
          {showRawNotes && (
            <div className="mt-2 space-y-2">
              <Textarea
                id="interaction-rawNotes"
                value={rawNotes}
                onChange={e => setRawNotes(e.target.value)}
                placeholder="Add notes from the meeting or email."
                className="h-24 resize-none"
              />
              {errors.rawNotes && <p className="text-destructive text-xs">{errors.rawNotes}</p>}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-xl"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isLoading} className="rounded-xl px-6">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save conversation
          </Button>
        </div>
      </form>
    </div>
  );
}
