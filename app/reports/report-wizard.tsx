'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ReportConfig,
  streamReport,
  saveReportToHistory,
  checkActivityCount,
} from '@/app/actions/reports';
import { updateReportSettings } from '@/app/actions/settings';
import debounce from 'lodash.debounce';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { copyTextToClipboard } from '@/lib/clipboard';
import { buildReviewAssistantInstructions } from '@/lib/assistant-instructions';
import { useSettings } from '@/components/providers/settings-provider';
import { ReportWizardEditor } from '@/components/reports/report-wizard-editor';
import {
  McpDraftActions,
  getMcpProviderLaunchUrl,
  providerSupportsPromptUrl,
  type ConnectedMcpProvider,
} from '@/components/reports/mcp-draft-actions';

interface Project {
  id: string;
  name: string;
}

interface ReportWizardProps {
  projects: Project[];
  connectedMcpProviders: ConnectedMcpProvider[];
}

export function ReportWizard({ projects, connectedMcpProviders }: ReportWizardProps) {
  const { settings } = useSettings();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: '7d',
    projectId: undefined, // All projects
    tone: 'professional',
    notes: '', // Placeholder for custom instructions
  });

  // Apply user's default settings when they load (during render phase to avoid cascading effects)
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) {
    if (settings) {
      setConfig(prev => ({
        ...prev,
        tone: (settings.defaultTone as ReportConfig['tone']) || prev.tone,
        notes: settings.customInstructions || prev.notes,
      }));
    }
    setPrevSettings(settings);
  }

  // Custom date selection state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportContent, setReportContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // New Validation Logic
  // When dateRange or config changes, we validate the count to ensure "Next" is only enabled when valid.
  const [hasValidActivities, setHasValidActivities] = useState(true); // default true to avoid flicker on load
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation logic
  const debouncedValidate = useMemo(
    () =>
      debounce(async (currentConfig: ReportConfig, currentRange: DateRange | undefined) => {
        setIsValidating(true);
        try {
          // Prepare temp config for check
          const tempConfig = { ...currentConfig };
          if (tempConfig.dateRange === 'custom') {
            // Wait until both dates are set
            if (!currentRange?.from || !currentRange?.to) {
              setIsValidating(false);
              setHasValidActivities(false);
              return;
            }

            tempConfig.customStartDate = format(currentRange.from, 'yyyy-MM-dd');
            tempConfig.customEndDate = format(currentRange.to || currentRange.from, 'yyyy-MM-dd');
          }

          const result = await checkActivityCount(tempConfig);
          const isValid = result.count > 0;
          setHasValidActivities(isValid);
        } catch (e) {
          console.error(e);
        } finally {
          setIsValidating(false);
        }
      }, 300),
    []
  );

  // Re-validate when dateRange or presets change
  useEffect(() => {
    // Only validate if we are in Step 1
    if (step !== 1) return;

    debouncedValidate(config, dateRange);

    return () => {
      debouncedValidate.cancel();
    };
  }, [config, dateRange, step, debouncedValidate]);

  const handleNextStep = () => {
    if (hasValidActivities && !isValidating) {
      nextStep();
    }
  };

  const startGeneration = async () => {
    nextStep(); // Go to step 4
    setIsStreaming(true);
    setReportContent('');

    // Auto-save the selected tone as future default
    if (config.tone) {
      updateReportSettings({ defaultTone: config.tone }).catch((err: Error) =>
        console.error('Failed to update default tone:', err)
      );
    }

    try {
      // Finalize config with custom dates if selected
      const finalConfig = { ...config };
      if (config.dateRange === 'custom' && dateRange?.from) {
        finalConfig.customStartDate = format(dateRange.from, 'yyyy-MM-dd');
        finalConfig.customEndDate = format(dateRange.to || dateRange.from, 'yyyy-MM-dd');
      }

      const { output } = await streamReport(finalConfig);

      setReportContent(output);
    } catch (error) {
      console.error('Streaming error', error);
      setReportContent('Could not create the draft. Try again.');
    } finally {
      setIsStreaming(false);
    }
  };

  // Helper to convert markdown to nice plain text for email
  const getCleanEmailBody = () => {
    let text = reportContent;
    // Remove bold/italic markers
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    // Remove header hashes but maybe keep newline spacing
    text = text.replace(/^#+\s+(.*)$/gm, '$1');
    // Remove link formatting [text](url) -> text (url)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
    return text;
  };

  const handleEmail = () => {
    const subject = `Jobmark review draft - ${format(new Date(), 'MMM dd, yyyy')}`;
    const body = getCleanEmailBody();
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleGmail = () => {
    const subject = `Jobmark review draft - ${format(new Date(), 'MMM dd, yyyy')}`;
    const body = getCleanEmailBody();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const finalConfig = { ...config };
    if (config.dateRange === 'custom' && dateRange?.from) {
      finalConfig.customStartDate = format(dateRange.from, 'yyyy-MM-dd');
      finalConfig.customEndDate = format(dateRange.to || dateRange.from, 'yyyy-MM-dd');
    }
    await saveReportToHistory(reportContent, finalConfig);
    setIsSaving(false);
    setSaved(true);
    // Maybe redirect or show success
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDraftWithProvider = async (provider: ConnectedMcpProvider) => {
    const prompt = buildReviewAssistantInstructions({
      period: getDateRangeLabel(config.dateRange, dateRange),
      projectScope: getProjectScopeLabel(config.projectId, projects),
      tone: getToneLabel(config.tone),
      focus: config.notes?.trim() || undefined,
    });
    const launchPrompt = prompt.length <= 2_000 ? prompt : undefined;
    const providerUrl = getMcpProviderLaunchUrl(provider.key, launchPrompt);

    // Start copying before opening a new tab. Some browsers revoke clipboard
    // permission as soon as focus moves to the provider tab.
    const copyPromise = copyTextToClipboard(prompt);
    // Open synchronously from the click event so popup protection does not
    // block the assistant while the clipboard permission prompt resolves.
    if (providerUrl) window.open(providerUrl, '_blank', 'noopener,noreferrer');

    try {
      const copied = await copyPromise;
      if (!copied) throw new Error('clipboard_unavailable');
      let promptDescription = `Open ${provider.name} and paste the instructions to start your review.`;
      if (launchPrompt && providerSupportsPromptUrl(provider.key)) {
        promptDescription = `Open ${provider.name} to draft your review with Jobmark.`;
      } else if (provider.key === 'gemini') {
        promptDescription =
          'Your instructions are copied. Paste them into Gemini to start your draft.';
      }
      toast.success(`${provider.name} instructions copied`, {
        description: promptDescription,
      });
    } catch {
      toast.error('Could not copy the instructions.');
    }
  };

  const stepLabels = ['Dates', 'Projects', 'Style', 'Draft'];
  const dateRangeLabel = getDateRangeButtonLabel(config, dateRange);
  const validationStatus = getValidationStatus(
    config.dateRange,
    dateRange,
    hasValidActivities,
    isValidating
  );

  return (
    <div className={cn('h-full py-8', step < 4 ? 'mx-auto max-w-2xl' : 'w-full')}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="mb-3">
          <h1 className="text-foreground text-2xl font-bold">Make a review draft</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose dates, projects, and a writing style.
          </p>
        </div>
      </div>

      {step <= 4 && (
        <div className="mb-12 flex items-center justify-between px-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300',
                  step >= i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i}
              </div>
              <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {stepLabels[i - 1]}
              </span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: TIME */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">Choose which dates to include</h2>
              <p className="text-muted-foreground">Choose the dates to use in the draft.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <OptionCard
                selected={config.dateRange === '7d'}
                onClick={() => setConfig({ ...config, dateRange: '7d' })}
                label="Last 7 days"
              />
              <OptionCard
                selected={config.dateRange === '30d'}
                onClick={() => setConfig({ ...config, dateRange: '30d' })}
                label="Last 30 days"
              />
              <OptionCard
                selected={config.dateRange === 'month'}
                onClick={() => setConfig({ ...config, dateRange: 'month' })}
                label="This month"
              />
            </div>

            {/* Custom Calendar Option */}
            <div className="mt-6 flex flex-col items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={config.dateRange === 'custom' ? 'default' : 'outline'}
                    className={cn(
                      'h-12 w-full px-6 md:w-auto',
                      config.dateRange === 'custom' ? '' : 'border-dashed'
                    )}
                    onClick={() => {
                      // Switch to custom mode
                      if (config.dateRange !== 'custom') {
                        setConfig({ ...config, dateRange: 'custom' });
                        // Explicitly clear any stale date range to force new selection
                        setDateRange(undefined);
                        setHasValidActivities(false); // Assume false until picked
                      }
                    }}
                  >
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="range"
                    // Important: undefined defaultMonth prevents auto-focus on today if not desired,
                    // but usually helpful. We ensure 'selected' is strictly controlled.
                    defaultMonth={dateRange?.from || new Date()}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Validation Warning */}
              <div className="mt-2 h-6 text-center text-sm">{validationStatus}</div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleNextStep}
                size="lg"
                className="px-8"
                disabled={!hasValidActivities || isValidating}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: FOCUS */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">Choose projects</h2>
              <p className="text-muted-foreground">Choose which notes to include.</p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="review-draft-projects">Projects</Label>
              <Select
                value={config.projectId === null ? 'unassigned' : config.projectId || 'all'}
                onValueChange={v => {
                  // Logic: 'all' -> undefined, 'unassigned' -> null, else -> string
                  let pid: string | null | undefined = v;
                  if (v === 'all') pid = undefined;
                  else if (v === 'unassigned') pid = null;
                  setConfig({ ...config, projectId: pid });
                }}
              >
                <SelectTrigger id="review-draft-projects" className="h-12">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  <SelectItem value="unassigned">Notes without a project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label htmlFor="review-draft-notes">What should the draft mention? (optional)</Label>
              <Input
                id="review-draft-notes"
                placeholder="e.g. a result you achieved or work with another team"
                value={config.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig({ ...config, notes: e.target.value })
                }
                className="bg-muted/30 h-12"
              />
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep} size="lg" className="px-8">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: STYLE */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">Choose the style</h2>
              <p className="text-muted-foreground">Choose how this draft should sound.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <OptionCard
                selected={config.tone === 'professional'}
                onClick={() => setConfig({ ...config, tone: 'professional' })}
                label="Formal"
                description="Clear and formal."
              />
              <OptionCard
                selected={config.tone === 'casual'}
                onClick={() => setConfig({ ...config, tone: 'casual' })}
                label="Casual"
                description="Friendly and short."
              />
              <OptionCard
                selected={config.tone === 'bullet-points'}
                onClick={() => setConfig({ ...config, tone: 'bullet-points' })}
                label="Bullet points"
                description="Short facts in a list."
              />
            </div>

            <McpDraftActions
              connectedMcpProviders={connectedMcpProviders}
              onDraftWithProvider={handleDraftWithProvider}
            />

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={startGeneration}
                size="lg"
                className="bg-primary hover:bg-primary/90 px-8"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Make review draft
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: EDITOR */}
        {step === 4 && (
          <ReportWizardEditor
            reportContent={reportContent}
            setReportContent={setReportContent}
            isStreaming={isStreaming}
            isSaving={isSaving}
            saved={saved}
            onBack={() => setStep(1)}
            onEmail={handleEmail}
            onGmail={handleGmail}
            onSave={handleSave}
            connectedMcpProviders={connectedMcpProviders}
            onDraftWithProvider={handleDraftWithProvider}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function getDateRangeLabel(range: ReportConfig['dateRange'], customRange?: DateRange) {
  if (range === '7d') return 'Last 7 days';
  if (range === '30d') return 'Last 30 days';
  if (range === 'month') return 'This month';
  if (range === 'custom' && customRange?.from) {
    if (customRange.to) {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`;
    }
    return format(customRange.from, 'MMM d');
  }
  return 'Custom range';
}

function getDateRangeButtonLabel(config: ReportConfig, dateRange?: DateRange): ReactNode {
  if (config.dateRange !== 'custom' || !dateRange?.from) {
    return <span>Choose a date range</span>;
  }
  if (dateRange.to) {
    return `${format(dateRange.from, 'LLL dd')} - ${format(dateRange.to, 'LLL dd')}`;
  }
  return format(dateRange.from, 'LLL dd');
}

function getValidationStatus(
  dateRangeKind: ReportConfig['dateRange'],
  dateRange: DateRange | undefined,
  hasValidActivities: boolean,
  isValidating: boolean
): ReactNode {
  if (dateRangeKind === 'custom' && (!dateRange?.from || !dateRange?.to)) {
    return <p className="text-muted-foreground text-xs">Choose a start and end date.</p>;
  }
  if (isValidating) {
    return <p className="text-muted-foreground animate-pulse text-xs">Checking notes...</p>;
  }
  if (!hasValidActivities) {
    return (
      <p className="text-destructive flex items-center justify-center gap-1 text-xs font-medium">
        <AlertCircle className="h-3 w-3" /> No notes in this range.
      </p>
    );
  }
  return (
    <p className="animate-in fade-in slide-in-from-bottom-1 flex items-center justify-center gap-1 text-xs text-green-600 opacity-0">
      <CheckCircle className="h-3 w-3" /> Ready to make the draft
    </p>
  );
}

function getProjectScopeLabel(projectId: string | null | undefined, projects: Project[]) {
  if (projectId === undefined) return 'All projects';
  if (projectId === null) return 'Notes without a project';
  return projects.find(project => project.id === projectId)?.name ?? 'Selected project';
}

function getToneLabel(tone: ReportConfig['tone']) {
  if (tone === 'professional') return 'Formal';
  if (tone === 'casual') return 'Casual';
  return 'Bullet points';
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
        'w-full cursor-pointer rounded-xl border-2 p-6 text-left transition-all duration-200 hover:scale-[1.02]',
        selected
          ? 'border-primary bg-primary/5 shadow-primary/10 shadow-lg'
          : 'border-border/50 bg-card hover:border-primary/50'
      )}
    >
      <div className="mb-1 text-lg font-semibold">{label}</div>
      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      )}
    </button>
  );
}
