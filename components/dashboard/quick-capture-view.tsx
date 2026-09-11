'use client';

import type { RefObject } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar as CalendarIcon, Loader2, Send, Sparkles } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DictateButton } from '@/components/ui/dictate-button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { ActivityFormState } from '@/app/actions/activities';
import { ProjectChipSelector } from '@/components/dashboard/dashboard-widgets';
import { cn } from '@/lib/utils';

interface QuickCaptureProject {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
}

interface QuickCaptureViewProps {
  formRef: RefObject<HTMLFormElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  currentAction: (formData: FormData) => void | Promise<void>;
  isPending: boolean;
  content: string;
  isPolishing: boolean;
  isListening: boolean;
  charCount: number;
  isValidLength: boolean;
  todayCount: number;
  dailyGoal: number;
  projects: QuickCaptureProject[];
  visibleProjects: QuickCaptureProject[];
  selectedProject: string;
  selectedDate: Date;
  maxDate: Date;
  datePickerOpen: boolean;
  state: ActivityFormState;
  dateLabel: string;
  onContentChange: (value: string) => void;
  onDatePickerOpenChange: (open: boolean) => void;
  onDateChange: (date: Date | undefined) => void;
  onProjectChange: (projectId: string) => void;
  onToggleListening: () => void;
}

export function QuickCaptureView({
  formRef,
  textareaRef,
  currentAction,
  isPending,
  content,
  isPolishing,
  isListening,
  charCount,
  isValidLength,
  todayCount,
  dailyGoal,
  projects,
  visibleProjects,
  selectedProject,
  selectedDate,
  maxDate,
  datePickerOpen,
  state,
  dateLabel,
  onContentChange,
  onDatePickerOpenChange,
  onDateChange,
  onProjectChange,
  onToggleListening,
}: QuickCaptureViewProps) {
  return (
    <Card className="bg-card border-border/50 warm-glow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Add a note</CardTitle>
          <span
            className={`rounded-xl px-2.5 py-1 text-xs font-medium ${
              todayCount >= dailyGoal ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
            }`}
          >
            {isListening ? (
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                  <span className="bg-destructive relative inline-flex h-2 w-2 rounded-full"></span>
                </span>
                Recording...
              </span>
            ) : (
              `${todayCount}/${dailyGoal} today`
            )}
          </span>
        </div>
        <CardDescription>What happened {dateLabel}?</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={currentAction}>
          <div className="space-y-4">
            <div className="group relative">
              <Textarea
                ref={textareaRef}
                name="content"
                value={content}
                onChange={e => onContentChange(e.target.value)}
                placeholder="Finished the dashboard update, reviewed two PRs, and clarified the API work."
                className="border-border/50 focus:bg-background/50 relative z-10 min-h-[100px] resize-none bg-transparent pr-16 transition-colors"
                disabled={isPending}
                data-quick-capture="true"
              />

              {isPolishing && (
                <div className="absolute right-2 bottom-2 z-30">
                  <div className="bg-background/80 border-border/50 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    Fixing the text...
                  </div>
                </div>
              )}
              <div className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 z-20 text-xs">
                <span className={charCount < 10 ? 'text-destructive' : ''}>{charCount}</span>
                /1000
              </div>
            </div>

            <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">
              <p>Keep the note short and clear.</p>
              <p>Try: fixed the bug, sent the update, finished the task.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {projects.length > 0 && (
                <>
                  <input type="hidden" name="projectId" value={selectedProject} />
                  <ProjectChipSelector
                    projects={visibleProjects}
                    selectedId={selectedProject}
                    onSelect={onProjectChange}
                  />
                </>
              )}

              <Popover open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'text-muted-foreground flex items-center gap-2 rounded-xl border px-3 py-2 transition-[color,background-color,border-color,box-shadow]',
                      'bg-background/50 hover:bg-muted/40 hover:text-primary',
                      datePickerOpen
                        ? 'border-primary/50 ring-primary/20 text-foreground ring-2'
                        : 'border-border/50 hover:border-primary/20'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm">{dateLabel}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={onDateChange}
                    disabled={date => date > maxDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="bg-border/50 mx-1 h-6 w-px" />

              <DictateButton
                isListening={isListening}
                isPolishing={isPolishing}
                onClick={onToggleListening}
                disabled={isPending}
              />
            </div>

            {state.errors?.content && (
              <p className="text-destructive text-sm">
                {state.errors.content[0]} Add what you did or what changed so you can use this note
                later.
              </p>
            )}

            {!state.success && state.message && !state.errors && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                <kbd className="bg-muted border-border/50 rounded-md border px-1.5 py-0.5 text-[10px]">
                  ⌘/Ctrl
                </kbd>
                {' + '}
                <kbd className="bg-muted border-border/50 rounded-md border px-1.5 py-0.5 text-[10px]">
                  Enter
                </kbd>
                {' to save'}
              </p>

              <input type="hidden" name="logDate" value={format(selectedDate, 'yyyy-MM-dd')} />

              <Button
                type="submit"
                disabled={!isValidLength || isPending}
                className="min-w-[120px] sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Save note
                  </>
                )}
              </Button>
            </div>

            {state.success && (
              <div className="border-border/50 bg-background/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">Note saved.</p>
                  <p className="text-muted-foreground text-xs">
                    Add another note, put this one in a project, or make a review draft.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => textareaRef.current?.focus()}
                  >
                    Add another
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/projects?new=true">Create project</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/reports?tab=new">Make review draft</Link>
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
