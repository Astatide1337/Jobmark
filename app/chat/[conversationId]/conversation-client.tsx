"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { updateConversationContext, type ConversationWithMessages, type ConversationMode } from "@/app/actions/chat";

interface ConversationClientProps {
  conversation: ConversationWithMessages;
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
}

export function ConversationClient({
  conversation,
  projects,
  goals,
}: ConversationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleContextChange = async (
    projectId?: string | null,
    goalId?: string | null
  ) => {
    startTransition(async () => {
      await updateConversationContext(conversation.id, projectId, goalId);
      router.refresh();
    });
  };

  return (
    <ChatInterface
      conversationId={conversation.id}
      mode={conversation.mode as ConversationMode}
      initialMessages={conversation.messages}
      projectId={conversation.projectId}
      goalId={conversation.goalId}
      projects={projects}
      goals={goals}
      onContextChange={handleContextChange}
    />
  );
}
