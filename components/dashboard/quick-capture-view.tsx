'use client';

import type { RefObject } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUp, Calendar as CalendarIcon, Loader2, Send, Sparkles, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DictateButton } from '@/components/ui/dictate-button';
import { Input } from '@/components/ui/input';
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
  containerRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  currentAction: (formData: FormData) => void | Promise<void>;
  isPending: boolean;
  content: string;
  selection: { start: number; end: number; text: string } | null;
  menuPosition: { top: number; left: number } | null;
  instruction: string;
  isImproving: boolean;
  isPolishing: boolean;
  isListening: boolean;
  charCount: number;
  isValidLength: boolean;
  isMac: boolean;
  todayCount: number;
  dailyGoal: number;
  projects: QuickCaptureProject[];
  visibleProjects: QuickCaptureProject[];
  selectedProject: string;
  selectedDate: Date;
  datePickerOpen: boolean;
  state: ActivityFormState;
  dateLabel: string;
  onContentChange: (value: string) => void;
  onSelectionChange: (selection: { start: number; end: number; text: string } | null) => void;
  onMenuPositionChange: (position: { top: number; left: number } | null) => void;
  onInstructionChange: (instruction: string) => void;
  onDatePickerOpenChange: (open: boolean) => void;
  onDateChange: (date: Date | undefined) => void;
  onProjectChange: (projectId: string) => void;
  onSelect: () => void;
  onImprove: () => void;
  onDismissToolbar: () => void;
  onToggleListening: () => void;
}

export function QuickCaptureView({
  formRef,
  containerRef,
  textareaRef,
  currentAction,
  isPending,
  content,
  selection,
  menuPosition,
  instruction,
  isImproving,
  isPolishing,
  isListening,
  charCount,
  isValidLength,
  isMac,
  todayCount,
  dailyGoal,
  projects,
  visibleProjects,
  selectedProject,
  selectedDate,
  datePickerOpen,
  state,
  dateLabel,
  onContentChange,
  onSelectionChange,
  onMenuPositionChange,
  onInstructionChange,
  onDatePickerOpenChange,
  onDateChange,
  onProjectChange,
  onSelect,
  onImprove,
  onDismissToolbar,
  onToggleListening,
}: QuickCaptureViewProps) {
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
        <CardDescription>What work should be part of your record {dateLabel}?</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={currentAction}>
          <div className="space-y-4">
            <div className="group relative">
              <div ref={containerRef} className="relative w-full">
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 z-0 break-words whitespace-pre-wrap text-transparent',
                    'min-h-[100px] w-full rounded-xl border border-transparent px-3 py-2 text-sm',
                    'bg-transparent'
                  )}
                >
                  {selection ? (
                    <>
                      {content.substring(0, selection.start)}
                      <span
                        ref={el => {
                          if (el && !menuPosition) {
                            const container = textareaRef.current;
                            if (container) {
                              const spanRect = el.getBoundingClientRect();
                              const containerRect = container.getBoundingClientRect();
                              const top = spanRect.bottom - containerRect.top;
                              const left = spanRect.left - containerRect.left + spanRect.width / 2;
                              onMenuPositionChange({ top, left });
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
                  <br />
                </div>

                <Textarea
                  ref={textareaRef}
                  name="content"
                  value={content}
                  onChange={e => onContentChange(e.target.value)}
                  onSelect={onSelect}
                  placeholder="Shipped the dashboard polish, reviewed two PRs, and clarified scope for the API work."
                  className="border-border/50 focus:bg-background/50 relative z-10 min-h-[100px] resize-none bg-transparent pr-16 transition-colors"
                  disabled={isPending}
                  data-quick-capture="true"
                />

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
                    <div className="border-b-popover absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-l-transparent drop-shadow-sm" />
                    <div className="bg-popover border-border flex w-[340px] items-center gap-2 rounded-xl border p-1 shadow-xl">
                      <div className="bg-primary/10 text-primary ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <Input
                        value={instruction}
                        onChange={e => onInstructionChange(e.target.value)}
                        placeholder="Try: 'make it shorter' or 'turn it into bullets'"
                        className="h-9 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onImprove();
                          }
                          if (e.key === 'Escape') onDismissToolbar();
                        }}
                        autoFocus
                      />
                      <div className="flex items-center gap-1 border-l pr-1 pl-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Apply text edit"
                          className={cn(
                            'hover:bg-primary/10 hover:text-primary h-8 w-8',
                            instruction && 'text-primary'
                          )}
                          onClick={onImprove}
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
                          aria-label="Close text toolbar"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/40 h-8 w-8 transition-all active:scale-90"
                          onClick={onDismissToolbar}
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
                      'text-muted-foreground flex items-center gap-2 rounded-xl border px-3 py-2 transition-all',
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
                    disabled={date => date > new Date()}
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
                {state.errors.content[0]} Add one concrete action or outcome so this entry is useful
                later.
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
