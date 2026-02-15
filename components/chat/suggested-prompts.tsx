"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Card } from "@/components/ui/card";
import {
  Target,
  Briefcase,
  Brain,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createConversation, type ConversationMode } from "@/app/actions/chat";
import { getPersonalizedGreeting } from "@/lib/chat/greeting";

export interface SuggestedPrompt {
  id: string;
  icon: any;
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
    id: "goal-setting",
    icon: Target,
    title: "Set a New Goal",
    description: "Break down a big ambition into a 7-step actionable plan",
    mode: "goal-coach" as ConversationMode,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "interview",
    icon: Briefcase,
    title: "Practice Interview",
    description: "Mock behavioral session based on your real project work",
    mode: "interview" as ConversationMode,
    needsProject: true,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "imposter",
    icon: Brain,
    title: "Overcome Self-Doubt",
    description: "Work through imposter syndrome and build career confidence",
    mode: "general" as ConversationMode,
    initialMessage: "I've been struggling with imposter syndrome at work. I feel like I don't belong and that people will find out I'm not as capable as they think. Can you help me work through these feelings?",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    id: "clarity",
    icon: TrendingUp,
    title: "Career Direction",
    description: "Get clarity on your path and figure out your next big move",
    mode: "general" as ConversationMode,
    initialMessage: "I feel stuck in my career and unsure where I want to go next. Can you help me think through my options and figure out a direction that aligns with my values?",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
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
        
        // If it has an initial message, we want to auto-start the stream on the next page
        const url = `/chat/${conversation.id}${prompt.initialMessage ? "?autoStart=true" : ""}`;
        router.push(url);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-10 pb-32">
      <div className="mb-8 text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-1000 fill-mode-both">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-serif leading-tight">
          {greeting}
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground/70 leading-relaxed font-medium">
          Your AI career partner. How shall we begin today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SUGGESTED_CHAT_PROMPTS.map((prompt) => (
          <div key={prompt.id} className="h-full">
            {prompt.needsProject ? (
              projects.length > 0 ? (
                <Card
                  className={cn(
                    "group relative h-full overflow-hidden border-border/40 bg-card/10 p-6 transition-all duration-500 hover:bg-card/20 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 rounded-[1.5rem]",
                    isPending && "pointer-events-none opacity-70"
                  )}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10",
                        prompt.bgColor
                      )}>
                        <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-muted-foreground/80 leading-relaxed text-sm mb-6">
                        {prompt.description}
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {projects.slice(0, 4).map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handlePromptClick(prompt, project.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 active:scale-95 shadow-sm"
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
                <Card className="h-full border-dashed border-border/60 bg-muted/5 p-6 rounded-[1.5rem] flex flex-col justify-center items-center text-center">
                  <h3 className="text-base font-bold text-muted-foreground/60 mb-2">{prompt.title}</h3>
                  <p className="text-xs text-muted-foreground/40 leading-relaxed">
                    Set up your first project to unlock this mode.
                  </p>
                </Card>
              )
            ) : (
              <Card
                onClick={() => handlePromptClick(prompt)}
                className={cn(
                  "group relative h-full cursor-pointer overflow-hidden border-border/40 bg-card/10 p-6 transition-all duration-500 hover:bg-card/20 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 rounded-[1.5rem]",
                  isPending && "pointer-events-none opacity-70"
                )}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10",
                      prompt.bgColor
                    )}>
                      <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                    </div>
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/10 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:bg-primary/10">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-all duration-300 group-hover:translate-x-1">
                      {prompt.title}
                    </h3>
                    <p className="text-muted-foreground/80 leading-relaxed text-sm group-hover:text-foreground transition-colors duration-300">
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
