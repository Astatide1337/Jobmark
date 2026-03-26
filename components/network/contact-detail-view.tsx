/**
 * Contact Detail View
 *
 * Why: This is the primary profile page for a professional contact.
 * It consolidates CRM data (email, phone, notes) with the user's
 * specific interaction history and AI-generated outreach drafts.
 *
 * Sub-components:
 * - ContactProfileCard: Displays the static "who is this" info.
 * - InteractionTimeline: A vertically-aligned list of past meetings/chats.
 * - OutreachWizard & History: The interface for generating new drafts.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DictateButton } from '@/components/ui/dictate-button';
import {
  Edit,
  Trash2,
  Loader2,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Users,
  Plus,
  Clock,
  MessageSquare,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { deleteContact, deleteInteraction, createInteraction } from '@/app/actions/network';
import { polishDictation } from '@/app/actions/dictation';
import { toast } from 'sonner';
import { ContactDialog } from '@/components/network/contact-dialog';
import { OutreachWizard } from '@/app/network/[contactId]/outreach-wizard';
import { OutreachDraftHistory } from '@/components/network/outreach-draft-history';
import {
  getAgeFromBirthday,
  formatDate,
  getChannelLabel,
  getRelativeDay,
  isDateOnlyOverdue,
  CHANNEL_OPTIONS,
} from '@/lib/network';
import { cn } from '@/lib/utils';

interface Interaction {
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

interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  birthday?: Date | null;
  relationship?: string | null;
  personalityTraits?: string | null;
  notes?: string | null;
  createdAt: Date;
  interactions: Interaction[];
}

interface ContactDetailViewProps {
  contact: Contact;
  interactions: Interaction[];
  initialDrafts: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date;
  }>;
}

export function ContactDetailView({
  contact,
  interactions,
  initialDrafts,
}: ContactDetailViewProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteContact(contact.id);
      if (result.success) {
        toast.success('Contact deleted');
        router.push('/network');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Delete contact error:', error);
      toast.error('Failed to delete contact');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{contact.fullName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Are you sure?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Two-column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile */}
        <div className="lg:col-span-1">
          <ContactProfileCard contact={contact} />
        </div>

        {/* Right Column: Tabbed */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="interactions" className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Interactions
              </TabsTrigger>
              <TabsTrigger value="outreach" className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" />
                Outreach Drafts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interactions">
              <InteractionTimeline
                interactions={interactions}
                contactId={contact.id}
                onInteractionAdded={() => router.refresh()}
              />
            </TabsContent>

            <TabsContent value="outreach" className="space-y-6">
              <OutreachWizard contact={contact} />
              <div className="space-y-3">
                <h3 className="text-muted-foreground px-1 text-sm font-semibold tracking-widest uppercase">
                  Saved Drafts
                </h3>
                <OutreachDraftHistory initialDrafts={initialDrafts} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <ContactDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contact={contact}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

function ContactProfileCard({ contact }: { contact: Contact }) {
  const age = getAgeFromBirthday(contact.birthday);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{contact.fullName}</CardTitle>
        {contact.relationship && (
          <Badge variant="secondary" className="w-fit">
            {contact.relationship}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="text-muted-foreground h-4 w-4 shrink-0" />
          {contact.birthday ? (
            <span>
              {formatDate(contact.birthday)}
              {age !== undefined && <span className="text-muted-foreground"> (age {age})</span>}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Add birthday</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="text-primary truncate hover:underline">
              {contact.email}
            </a>
          ) : (
            <span className="text-muted-foreground italic">No email</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
              {contact.phone}
            </a>
          ) : (
            <span className="text-muted-foreground italic">No phone</span>
          )}
        </div>

        {contact.personalityTraits && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Users className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">Personality</span>
              </div>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {contact.personalityTraits}
              </p>
            </div>
          </>
        )}

        {contact.notes && (
          <>
            <Separator />
            <div>
              <span className="mb-2 block text-sm font-medium">Notes</span>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  call: 'bg-green-500/15 text-green-700 dark:text-green-400',
  text: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'in-person': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  linkedin: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  video: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  other: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
};

function InteractionTimeline({
  interactions,
  contactId,
  onInteractionAdded,
}: {
  interactions: Interaction[];
  contactId: string;
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
        toast.success('Interaction deleted');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Delete interaction error:', error);
      toast.error('Failed to delete interaction');
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
          <CardTitle className="text-lg">Interactions</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'outline' : 'default'}
          >
            <Plus className="mr-1 h-4 w-4" />
            Log Interaction
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
            <p className="text-foreground text-sm font-medium">No interactions logged yet.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Keep a light record of meaningful touchpoints so this relationship stays useful and current.
            </p>
            {!showForm && (
              <Button variant="link" size="sm" className="mt-2" onClick={() => setShowForm(true)}>
                Log your first interaction
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
                    <div className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
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
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-6 w-6 p-0 transition-all active:scale-95"
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
                        className="text-muted-foreground hover:text-primary h-7 px-2 text-xs transition-all active:scale-95"
                        onClick={() => toggleRawNotes(interaction.id)}
                      >
                        <ChevronDown
                          className={cn(
                            'mr-1 h-3.5 w-3.5 transition-transform',
                            expandedRawNotes.has(interaction.id) && 'rotate-180'
                          )}
                        />
                        {expandedRawNotes.has(interaction.id) ? 'Hide raw notes' : 'View raw notes'}
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
                        isDateOnlyOverdue(interaction.followUpDate)
                          ? 'text-destructive font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Follow up: {formatDate(interaction.followUpDate)} (
                        {getRelativeDay(interaction.followUpDate)})
                      </span>
                      {isDateOnlyOverdue(interaction.followUpDate) && (
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
      toast.error("Voice dictation isn't supported in this browser (try Chrome/Edge).");
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
        toast.error('Dictation error. Please try again.');
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
      console.error('Dictation polish error:', error);
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
        toast.success('Interaction logged');
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
      console.error('Interaction log error:', error);
      toast.error('Failed to log interaction');
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
              Summary <span className="text-destructive">*</span>
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
            placeholder="What did you discuss? Key takeaways..."
            className="h-20 resize-none"
          />
          {errors.summary && <p className="text-destructive text-xs">{errors.summary}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interaction-nextStep">Next Step</Label>
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
            placeholder="Any follow-up actions..."
            className="h-16 resize-none"
          />
          {errors.nextStep && <p className="text-destructive text-xs">{errors.nextStep}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interaction-followUpDate">Follow-up Date</Label>
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
                    : 'Pick a follow-up date'}
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
            Raw Notes
          </button>
          {showRawNotes && (
            <div className="mt-2 space-y-2">
              <Textarea
                id="interaction-rawNotes"
                value={rawNotes}
                onChange={e => setRawNotes(e.target.value)}
                placeholder="Paste meeting notes, email threads, etc."
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
            Log Interaction
          </Button>
        </div>
      </form>
    </div>
  );
}
