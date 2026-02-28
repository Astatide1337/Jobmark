'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { readStreamableValue } from '@ai-sdk/rsc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  Copy,
  Mail,
  Download,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  File,
} from 'lucide-react';
import {
  generateOutreachDraft,
  improveOutreachDraft,
  saveOutreachDraftToHistory,
} from '@/app/actions/network-ai';
import { exportToPdf, exportToWord } from '@/lib/report-export';
import { LiveEditor } from '@/components/reports/live-editor';
import { OUTREACH_OBJECTIVES, OUTREACH_TONES, OUTREACH_CHANNELS } from '@/lib/network';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ContactSummary {
  id: string;
  fullName: string;
  email?: string | null;
  relationship?: string | null;
  personalityTraits?: string | null;
  notes?: string | null;
  interactions: Array<{
    occurredAt: Date;
    channel: string;
    summary: string;
  }>;
}

interface OutreachWizardProps {
  contact: ContactSummary;
}

function OptionCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-5 text-left transition-all hover:scale-[1.02]',
        selected
          ? 'border-primary bg-primary/5 shadow-primary/10 shadow-lg'
          : 'border-border/50 bg-card hover:border-primary/50'
      )}
    >
      <p className="text-base font-semibold">{label}</p>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
    </button>
  );
}

function getCleanEmailBody(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');
}

export function OutreachWizard({ contact }: OutreachWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<{
    contactId: string;
    objective: string;
    tone: string;
    channel: string;
    extraContext: string;
  }>({
    contactId: contact.id,
    objective: OUTREACH_OBJECTIVES[0].value,
    tone: OUTREACH_TONES[0].value,
    channel: OUTREACH_CHANNELS[0].value,
    extraContext: '',
  });
  const [draftContent, setDraftContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startGeneration = async () => {
    setStep(4);
    setIsStreaming(true);
    setDraftContent('');
    try {
      const finalConfig = {
        ...config,
        extraContext: config.extraContext.trim() || undefined,
      };
      const { output } = await generateOutreachDraft(finalConfig);
      for await (const delta of readStreamableValue(output)) {
        if (delta) setDraftContent(prev => prev + delta);
      }
    } catch (err) {
      console.error('Draft generation failed:', err);
      toast.error('Failed to generate draft. Please try again.');
      setStep(3);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSave = async () => {
    if (!draftContent || isSaving || saved) return;
    setIsSaving(true);
    try {
      await saveOutreachDraftToHistory(draftContent, config);
      setSaved(true);
      router.refresh();
      toast.success('Draft saved to history!');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmail = () => {
    const body = getCleanEmailBody(draftContent);
    let subject = `Reaching out – ${contact.fullName}`;
    const subjectMatch = draftContent.match(/^Subject:\s*(.+)$/m);
    if (subjectMatch) subject = subjectMatch[1].trim();
    const mailto = `mailto:${contact.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleGmail = () => {
    const body = getCleanEmailBody(draftContent);
    let subject = `Reaching out – ${contact.fullName}`;
    const subjectMatch = draftContent.match(/^Subject:\s*(.+)$/m);
    if (subjectMatch) subject = subjectMatch[1].trim();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email ?? '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const STEP_LABELS = ['Goal', 'Context', 'Tone'];

  return (
    <div className="flex flex-col gap-6">
      {/* Progress indicator */}
      {step < 4 && (
        <div className="flex items-center justify-center gap-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isComplete = step > num;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    isActive || isComplete
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {num}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div className={cn('ml-2 h-px w-8', step > num ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Step 1: Goal ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">What&apos;s your goal?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose the purpose of your outreach to {contact.fullName}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {OUTREACH_OBJECTIVES.map(obj => (
                <OptionCard
                  key={obj.value}
                  selected={config.objective === obj.value}
                  onClick={() => setConfig(c => ({ ...c, objective: obj.value }))}
                  label={obj.label}
                />
              ))}
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={config.channel}
                onValueChange={val => setConfig(c => ({ ...c, channel: val }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTREACH_CHANNELS.map(ch => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="rounded-xl px-8">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Context ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">Add context</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                The AI already has {contact.fullName}&apos;s profile and interaction history. Add
                anything extra here.
              </p>
            </div>

            {/* Contact summary */}
            <Card className="bg-muted/40 border-border/50">
              <CardContent className="space-y-1.5 p-4 text-sm">
                <p className="text-foreground font-medium">{contact.fullName}</p>
                {contact.relationship && (
                  <p className="text-muted-foreground">{contact.relationship}</p>
                )}
                {contact.personalityTraits && (
                  <p className="text-muted-foreground italic">
                    &ldquo;{contact.personalityTraits}&rdquo;
                  </p>
                )}
                <p className="text-muted-foreground">
                  {contact.interactions.length} interaction
                  {contact.interactions.length !== 1 ? 's' : ''} logged
                  {contact.interactions.length > 0 &&
                    ` · Last: ${format(new Date(contact.interactions[0].occurredAt), 'MMM d, yyyy')}`}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Additional context (optional)</Label>
              <Textarea
                value={config.extraContext}
                onChange={e => setConfig(c => ({ ...c, extraContext: e.target.value }))}
                placeholder="e.g. I saw they just got promoted, we met at the Austin conference last month…"
                rows={3}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="rounded-xl px-8">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Tone ── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">Pick a tone</h2>
              <p className="text-muted-foreground mt-1 text-sm">How should this message feel?</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {OUTREACH_TONES.map(t => (
                <OptionCard
                  key={t.value}
                  selected={config.tone === t.value}
                  onClick={() => setConfig(c => ({ ...c, tone: t.value }))}
                  label={t.label}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={startGeneration} className="rounded-xl px-8 font-semibold">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Draft
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Editor ── */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex gap-6"
          >
            {/* Live editor */}
            <div className="border-border/50 bg-card/30 flex-1 overflow-hidden rounded-xl border shadow-xl">
              <LiveEditor
                value={draftContent}
                onChange={setDraftContent}
                isStreaming={isStreaming}
                onImprove={improveOutreachDraft}
                placeholder="Draft will stream here…"
              />
            </div>

            {/* Sidebar */}
            <div className="flex w-56 shrink-0 flex-col gap-3 pt-4">
              <p className="text-muted-foreground px-1 text-xs font-bold tracking-widest uppercase">
                Actions
              </p>

              {/* Send via */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send via…
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={handleEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Default Mail App
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGmail}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Gmail
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Download */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() =>
                      exportToPdf(draftContent, { filename: `${contact.fullName}-outreach.pdf` })
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportToWord(draftContent, { filename: `${contact.fullName}-outreach.doc` })
                    }
                  >
                    <File className="mr-2 h-4 w-4" />
                    Download as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Copy */}
              <Button
                variant="outline"
                className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
                onClick={() => {
                  navigator.clipboard.writeText(draftContent);
                  toast.success('Copied to clipboard!');
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Text
              </Button>

              <div className="h-4" />

              {/* Save to History */}
              <Button
                onClick={handleSave}
                disabled={isStreaming || isSaving || !draftContent}
                className="h-12 w-full rounded-xl bg-[var(--accent-warm)] font-semibold text-black shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Saved!
                  </>
                ) : isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Save to History'
                )}
              </Button>

              {/* Start over */}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => {
                  setStep(1);
                  setDraftContent('');
                  setSaved(false);
                }}
              >
                Start over
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
