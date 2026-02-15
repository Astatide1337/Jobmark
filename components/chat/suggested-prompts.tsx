"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  Target,
  Briefcase,
  Sparkles,
  Brain,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createConversation, type ConversationMode } from "@/app/actions/chat";

interface SuggestedPromptsProps {
  projects: Array<{ id: string; name: string; color: string }>;
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

export function SuggestedPrompts({ projects }: SuggestedPromptsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
          AI Career Mentor
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-sm">
          Get personalized guidance for goal-setting, interview practice, and overcoming career challenges.
        </p>
      </motion.div>

      {/* Prompt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROMPTS.map((prompt, index) => (
          <motion.div
            key={prompt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            {prompt.needsProject ? (
              // Interview prompt needs project selection
              projects.length > 0 ? (
                <Card
                  className={cn(
                    "group cursor-pointer p-4 transition-colors border-border/50 bg-card h-full flex flex-col hover:bg-muted/30",
                    prompt.hoverBorder
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", prompt.bgColor)}>
                      <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-1 transition-colors text-base">
                        {prompt.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {prompt.description}
                      </p>
                      {/* Project chips */}
                      <div className="flex flex-wrap gap-2">
                        {projects.slice(0, 3).map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handlePromptClick(prompt, project.id)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-xs hover:bg-secondary transition-colors text-secondary-foreground border border-transparent hover:border-border"
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
                // No projects - show disabled card
                <Card className="p-4 border-border/30 opacity-60 bg-muted/20 h-full">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <prompt.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-muted-foreground mb-1 text-base">
                        {prompt.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Create a project first to practice interviews
                      </p>
                    </div>
                  </div>
                </Card>
              )
            ) : (
              // Regular prompt
              <Card
                onClick={() => handlePromptClick(prompt)}
                className={cn(
                  "group cursor-pointer p-4 transition-colors border-border/50 bg-card h-full hover:bg-muted/30",
                  prompt.hoverBorder,
                  isPending && "pointer-events-none opacity-70"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", prompt.bgColor)}>
                    <prompt.icon className={cn("h-5 w-5", prompt.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1 transition-colors text-base">
                      {prompt.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
