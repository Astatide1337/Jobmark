'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/chat-interface';
import {
  updateConversationContext,
  type ConversationWithMessages,
  type ConversationMode,
} from '@/app/actions/chat';

interface ConversationClientProps {
  conversation: ConversationWithMessages;
  userName?: string | null;
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts: Array<{
    id: string;
    fullName: string;
    relationship: string | null;
    interactionsCount: number;
  }>;
  reports: Array<{ id: string; title: string; createdAt: Date }>;
}

export function ConversationClient({
  conversation,
  userName,
  projects,
  goals,
  contacts,
  reports,
}: ConversationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleContextChange = async (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null,
    reportIds?: string[]
  ) => {
    startTransition(async () => {
      await updateConversationContext(conversation.id, projectId, goalId, contactId, reportIds);
      router.refresh();
    });
  };

  return (
    <ChatInterface
      conversationId={conversation.id}
      mode={conversation.mode as ConversationMode}
      userName={userName}
      initialMessages={conversation.messages}
      projectId={conversation.projectId}
      goalId={conversation.goalId}
      contactId={conversation.contactId}
      reportIds={conversation.reports.map(r => r.id)}
      projects={projects}
      goals={goals}
      contacts={contacts}
      reports={reports}
      isContextPending={isPending}
      onContextChange={handleContextChange}
    />
  );
}
