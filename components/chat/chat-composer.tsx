'use client';

import type { Dispatch, KeyboardEventHandler, RefObject, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, FileText, Square, Users, Target, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ContextSelector } from './context-selector';
import type { ConversationMode } from '@/app/actions/chat';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  mode: ConversationMode;
  isStreaming: boolean;
  isContextPending: boolean;
  showJumpToLatest: boolean;
  onJumpToLatest: () => void;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSend: () => void | Promise<void>;
  onStop: () => void;
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts: Array<{
    id: string;
    fullName: string;
    relationship: string | null;
    interactionsCount: number;
  }>;
  reports: Array<{ id: string; title: string; createdAt: Date }>;
  selectedProjectIds: string[];
  selectedGoalIds: string[];
  selectedContactIds: string[];
  selectedReportIds: string[];
  setSelectedProjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedGoalIds: Dispatch<SetStateAction<string[]>>;
  setSelectedContactIds: Dispatch<SetStateAction<string[]>>;
  setSelectedReportIds: Dispatch<SetStateAction<string[]>>;
  onContextOpen: () => void;
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null,
    reportIds?: string[]
  ) => void;
}

function getModePlaceholder(mode: ConversationMode): string {
  switch (mode) {
    case 'goal-coach':
      return 'Describe your goal...';
    case 'interview':
      return 'Type your interview answer...';
    default:
      return 'Ask your coach anything...';
  }
}

export function ChatComposer({
  input,
  setInput,
  textareaRef,
  mode,
  isStreaming,
  isContextPending,
  showJumpToLatest,
  onJumpToLatest,
  onKeyDown,
  onSend,
  onStop,
  projects,
  goals,
  contacts,
  reports,
  selectedProjectIds,
  selectedGoalIds,
  selectedContactIds,
  selectedReportIds,
  setSelectedProjectIds,
  setSelectedGoalIds,
  setSelectedContactIds,
  setSelectedReportIds,
  onContextOpen,
  onContextChange,
}: ChatComposerProps) {
  return (
    <div className="from-background via-background/90 pointer-events-none absolute right-0 bottom-0 left-0 z-30 bg-gradient-to-t to-transparent px-4 pt-20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative mx-auto w-full max-w-2xl">
        {showJumpToLatest && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="absolute -top-14 left-1/2 z-40 -translate-x-1/2"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-primary/20 bg-background/95 hover:bg-background h-8 gap-2 rounded-full border text-[11px] shadow-2xl backdrop-blur transition-all hover:scale-105 active:scale-95"
              onClick={onJumpToLatest}
            >
              <ArrowDown className="text-primary h-3 w-3" />
              <span className="text-foreground font-semibold">New messages</span>
            </Button>
          </motion.div>
        )}

        <div
          className={cn(
            'bg-card/60 group relative flex flex-col rounded-[24px] border border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 ease-in-out',
            isStreaming
              ? 'border-primary/30 ring-primary/10 ring-1'
              : 'focus-within:border-primary/50 focus-within:ring-primary/20 focus-within:ring-1 hover:border-white/20'
          )}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={getModePlaceholder(mode)}
            className="placeholder:text-muted-foreground/30 text-foreground scrollbar-none max-h-[200px] min-h-[56px] w-full resize-none border-0 bg-transparent px-5 py-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
            disabled={isStreaming || isContextPending}
            rows={1}
          />

          <div className="flex items-center justify-between px-2 pb-2 pl-4">
            <div
              className={cn(
                'min-w-0 flex-1 transition-opacity',
                isContextPending && 'pointer-events-none opacity-50'
              )}
            >
              <p className="text-muted-foreground mb-2 px-1 text-[11px]">
                Attach the evidence you want the coach to work from.
              </p>
              <ContextSelector
                projects={projects}
                goals={goals}
                contacts={contacts}
                reports={reports}
                selectedProjectIds={selectedProjectIds}
                selectedGoalIds={selectedGoalIds}
                selectedContactIds={selectedContactIds}
                selectedReportIds={selectedReportIds}
                onProjectSelect={ids => {
                  setSelectedProjectIds(ids);
                  onContextChange?.(
                    ids[0] || null,
                    selectedGoalIds[0] || null,
                    selectedContactIds[0] || null,
                    selectedReportIds
                  );
                }}
                onGoalSelect={ids => {
                  setSelectedGoalIds(ids);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    ids[0] || null,
                    selectedContactIds[0] || null,
                    selectedReportIds
                  );
                }}
                onContactSelect={ids => {
                  setSelectedContactIds(ids);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    selectedGoalIds[0] || null,
                    ids[0] || null,
                    selectedReportIds
                  );
                }}
                onReportSelect={ids => {
                  setSelectedReportIds(ids);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    selectedGoalIds[0] || null,
                    selectedContactIds[0] || null,
                    ids
                  );
                }}
                onProjectRemove={id => {
                  const next = selectedProjectIds.filter(p => p !== id);
                  setSelectedProjectIds(next);
                  onContextChange?.(
                    next[0] || null,
                    selectedGoalIds[0] || null,
                    selectedContactIds[0] || null,
                    selectedReportIds
                  );
                }}
                onGoalRemove={id => {
                  const next = selectedGoalIds.filter(g => g !== id);
                  setSelectedGoalIds(next);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    next[0] || null,
                    selectedContactIds[0] || null,
                    selectedReportIds
                  );
                }}
                onContactRemove={id => {
                  const next = selectedContactIds.filter(c => c !== id);
                  setSelectedContactIds(next);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    selectedGoalIds[0] || null,
                    next[0] || null,
                    selectedReportIds
                  );
                }}
                onReportRemove={id => {
                  const next = selectedReportIds.filter(r => r !== id);
                  setSelectedReportIds(next);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    selectedGoalIds[0] || null,
                    selectedContactIds[0] || null,
                    next
                  );
                }}
                onOpenContextModal={() => onContextOpen()}
              />
            </div>

            <div className="ml-2 flex shrink-0 items-center gap-2">
              {isStreaming ? (
                <Button
                  onClick={onStop}
                  variant="ghost"
                  size="icon"
                  className="bg-primary/10 hover:bg-primary/20 text-primary h-9 w-9 rounded-full transition-all duration-300"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button
                  onClick={() => void onSend()}
                  disabled={!input.trim() || isContextPending}
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-full shadow-md transition-all duration-500',
                    input.trim()
                      ? 'bg-primary text-primary-foreground shadow-primary/20 hover:scale-105 active:scale-95'
                      : 'bg-muted/30 text-muted-foreground/30 opacity-40'
                  )}
                >
                  <ArrowUp className="h-5 w-5" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-muted-foreground/20 text-[9px] font-bold tracking-[0.2em] uppercase">
            Jobmark Coach
          </p>
          <p className="text-muted-foreground/50 mt-1 text-[11px]">
            AI can help synthesize your record, but you remain the source of truth.
          </p>
        </div>
      </div>
    </div>
  );
}
