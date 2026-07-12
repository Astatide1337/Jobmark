'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, Briefcase, FileText, Target, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { createConversation, type ConversationMode } from '@/app/actions/chat';
import { getPersonalizedGreeting } from '@/lib/chat/greeting';

interface SuggestedPrompt {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  mode: ConversationMode;
  color: string;
  bgColor: string;
  needsProject?: boolean;
  initialMessage?: string;
}

const SUGGESTED_CHAT_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'goal-setting',
    icon: Target,
    title: 'Clarify a Goal',
    description: 'Turn a vague ambition into something concrete you can actually follow',
    mode: 'goal-coach' as ConversationMode,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'interview',
    icon: Briefcase,
    title: 'Practice Interview',
    description: 'Mock behavioral session based on your real project work',
    mode: 'interview' as ConversationMode,
    needsProject: true,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'manager-update',
    icon: FileText,
    title: 'Draft Manager Update',
    description: 'Turn recent work into a concise update you can send or say out loud',
    mode: 'general' as ConversationMode,
    initialMessage:
      'Use my recent work record to draft a concise manager update with the most relevant progress and outcomes.',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'self-review',
    icon: TrendingUp,
    title: 'Prepare Self-Review',
    description: 'Pull the strongest evidence from recent work and frame it clearly',
    mode: 'general' as ConversationMode,
    initialMessage:
      'Help me prepare a self-review from my recent work. Pull out the strongest examples of impact, ownership, and momentum.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'project-patterns',
    icon: Brain,
    title: 'Review Project Patterns',
    description: 'Look at where my effort is concentrated and where the record still feels thin',
    mode: 'general' as ConversationMode,
    initialMessage:
      'What patterns do you see in my project focus, and where is my record still too thin to support a strong review?',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

interface SuggestedPromptsProps {
  projects: Array<{ id: string; name: string; color: string }>;
  userName?: string | null;
  onSelect?: (prompt: string) => void;
}

export function SuggestedPrompts({ projects, userName, onSelect }: SuggestedPromptsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const greeting = useMemo(() => getPersonalizedGreeting({ name: userName }), [userName]);

  const handlePromptClick = async (prompt: SuggestedPrompt, projectId?: string) => {
    if (onSelect && !prompt.needsProject) {
      onSelect(prompt.initialMessage || prompt.title);
      return;
    }

    startTransition(async () => {
      try {
        const conversation = await createConversation(
          prompt.mode,
          projectId,
          undefined,
          undefined,
          prompt.initialMessage
        );

        const url = `/chat/${conversation.id}${prompt.initialMessage ? '?autoStart=true' : ''}`;
        router.push(url);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 md:py-10">
      <div className="animate-in fade-in slide-in-from-top-4 fill-mode-both mb-8 space-y-3 text-center duration-1000">
        <h1 className="text-foreground font-serif text-3xl leading-tight font-bold tracking-tight md:text-4xl">
          {greeting}
        </h1>
        <p className="text-muted-foreground/70 mx-auto max-w-xl text-base leading-relaxed font-medium">
          Use your work record to draft updates, prepare reviews, and spot the gaps that still need
          evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SUGGESTED_CHAT_PROMPTS.map(prompt => (
          <div key={prompt.id} className="h-full">
            {prompt.needsProject ? (
              projects.length > 0 ? (
                <Card
                  className={cn(
                    'group border-border/40 bg-card/10 hover:border-primary/30 hover:bg-card/20 hover:shadow-primary/5 relative h-full overflow-hidden rounded-[1.5rem] p-6 transition-all duration-500 hover:shadow-xl',
                    isPending && 'pointer-events-none opacity-70'
                  )}
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10',
                          prompt.bgColor
                        )}
                      >
                        <prompt.icon className={cn('h-5 w-5', prompt.color)} />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-muted-foreground/80 mb-6 text-sm leading-relaxed">
                        {prompt.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {projects.slice(0, 4).map(project => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handlePromptClick(prompt, project.id)}
                              disabled={isPending}
                              className="border-border/60 bg-background/40 text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              {project.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="border-border/60 bg-muted/5 flex h-full flex-col items-center justify-center rounded-[1.5rem] border-dashed p-6 text-center">
                  <h3 className="text-muted-foreground/60 mb-2 text-base font-bold">
                    {prompt.title}
                  </h3>
                  <p className="text-muted-foreground/40 text-xs leading-relaxed">
                    Add a project first so the coach has something concrete to work from.
                  </p>
                </Card>
              )
            ) : (
              <Card
                onClick={() => handlePromptClick(prompt)}
                className={cn(
                  'group border-border/40 bg-card/10 hover:border-primary/30 hover:bg-card/20 hover:shadow-primary/5 relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] p-6 transition-all duration-500 hover:shadow-xl',
                  isPending && 'pointer-events-none opacity-70'
                )}
              >
                <div className="flex h-full flex-col">
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10',
                        prompt.bgColor
                      )}
                    >
                      <prompt.icon className={cn('h-5 w-5', prompt.color)} />
                    </div>
                    <div className="bg-muted/10 group-hover:bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100">
                      <ArrowRight className="text-primary h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-bold transition-all duration-300 group-hover:translate-x-1">
                      {prompt.title}
                    </h3>
                    <p className="text-muted-foreground/80 group-hover:text-foreground text-sm leading-relaxed transition-colors duration-300">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
