"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Card } from "@/components/ui/card";
import {
  Target,
  Briefcase,
  Brain,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createConversation, type ConversationMode } from "@/app/actions/chat";
import { getPersonalizedGreeting } from "@/lib/chat/greeting";

interface SuggestedPromptsProps {
  projects: Array<{ id: string; name: string; color: string }>;
  userName?: string | null;
}

const PROMPTS = [
  {
    id: "goal-setting",
    icon: Target,
    title: "Set a New Goal",
    description: "Walk through Brian Tracy's proven 7-step goal-setting method",
    mode: "goal-coach" as ConversationMode,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hoverBorder: "group-hover:border-amber-500/50",
  },
  {
    id: "interview",
    icon: Briefcase,
    title: "Practice Interview",
    description: "Mock behavioral interview based on your project work",
    mode: "interview" as ConversationMode,
    needsProject: true,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverBorder: "group-hover:border-blue-500/50",
  },
  {
    id: "imposter",
    icon: Brain,
    title: "Overcome Self-Doubt",
    description: "Work through imposter syndrome and build confidence",
    mode: "general" as ConversationMode,
    initialMessage: "I've been struggling with imposter syndrome at work. I feel like I don't belong and that people will find out I'm not as capable as they think. Can you help me work through these feelings?",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    hoverBorder: "group-hover:border-rose-500/50",
  },
  {
    id: "clarity",
    icon: TrendingUp,
    title: "Career Direction",
    description: "Get clarity on your career path and next steps",
    mode: "general" as ConversationMode,
    initialMessage: "I feel stuck in my career and unsure where I want to go next. Can you help me think through my options and figure out a direction that aligns with my values?",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    hoverBorder: "group-hover:border-emerald-500/50",
  },
];

export function SuggestedPrompts({ projects, userName }: SuggestedPromptsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const greeting = useMemo(() => getPersonalizedGreeting({ name: userName }), [userName]);

  const handlePromptClick = async (prompt: typeof PROMPTS[number], projectId?: string) => {
    startTransition(async () => {
      try {
        const conversation = await createConversation(
          prompt.mode,
          projectId
        );
        router.push(`/chat/${conversation.id}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-1 pb-8 pt-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{greeting}</h1>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
          Pick a starting point for this new conversation. I can coach your goals,
          run interview practice, or help untangle career blockers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PROMPTS.map((prompt) => (
          <div key={prompt.id} className="h-full">
            {prompt.needsProject ? (
              projects.length > 0 ? (
                <Card
                  className={cn(
                    "group h-full border-border/70 bg-card/70 p-5 transition-colors",
                    isPending && "pointer-events-none opacity-70"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        prompt.bgColor
                      )}
                    >
                      <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground">{prompt.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{prompt.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {projects.slice(0, 4).map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handlePromptClick(prompt, project.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
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
                </Card>
              ) : (
                <Card className="h-full border-border/70 bg-card/40 p-5 opacity-70">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <prompt.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{prompt.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add a project first to start interview practice.
                      </p>
                    </div>
                  </div>
                </Card>
              )
            ) : (
              <Card
                onClick={() => handlePromptClick(prompt)}
                className={cn(
                  "group h-full cursor-pointer border-border/70 bg-card/70 p-5 transition-colors hover:bg-card",
                  isPending && "pointer-events-none opacity-70"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      prompt.bgColor
                    )}
                  >
                    <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{prompt.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{prompt.description}</p>
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
