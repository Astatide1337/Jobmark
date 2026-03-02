'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Conversation modes
export type ConversationMode = 'general' | 'goal-coach' | 'interview';

// Types
export interface ConversationData {
  id: string;
  title: string;
  mode: ConversationMode;
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string; color: string } | null;
  goal: { id: string; title: string } | null;
  contact: { id: string; fullName: string } | null;
  reports: { id: string; title: string; createdAt: Date }[];
}

export interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface ConversationWithMessages extends ConversationData {
  messages: MessageData[];
}

/**
 * Create a new conversation
 */
export async function createConversation(
  mode: ConversationMode = 'general',
  projectId?: string,
  goalId?: string,
  contactId?: string,
  initialMessage?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const titles: Record<string, string> = {
    'goal-coach': 'Goal Setting Session',
    interview: 'Mock Interview',
  };

  const conversation = await (prisma.conversation as any).create({
    data: {
      userId: session.user.id,
      mode,
      projectId: projectId || null,
      goalId: goalId || null,
      contactId: contactId || null,
      title: titles[mode] || 'New Chat',
      messages: initialMessage
        ? {
            create: {
              role: 'user',
              content: initialMessage,
            },
          }
        : undefined,
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
      reports: { select: { id: true, title: true, createdAt: true } },
    },
  });

  revalidatePath('/chat');

  return {
    id: conversation.id,
    title: conversation.title,
    mode: conversation.mode as ConversationMode,
    projectId: conversation.projectId,
    goalId: conversation.goalId,
    contactId: conversation.contactId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    project: conversation.project,
    goal: conversation.goal,
    contact: conversation.contact,
    reports: conversation.reports ?? [],
    hasInitialMessage: !!initialMessage,
  };
}

/**
 * Get list of user's conversations
 */
export async function getConversations(limit = 20): Promise<ConversationData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = await (prisma.conversation as any).findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
      reports: { select: { id: true, title: true, createdAt: true } },
    },
  });

  return conversations.map((c: ConversationData) => ({
    id: c.id,
    title: c.title,
    mode: c.mode,
    projectId: c.projectId,
    goalId: c.goalId,
    contactId: c.contactId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    project: c.project,
    goal: c.goal,
    contact: c.contact,
    reports: c.reports ?? [],
  }));
}

/**
 * Get a specific conversation with its messages
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = await (prisma.conversation as any).findUnique({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
      reports: { select: { id: true, title: true, createdAt: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    title: conversation.title,
    mode: conversation.mode as ConversationMode,
    projectId: conversation.projectId,
    goalId: conversation.goalId,
    contactId: conversation.contactId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    project: conversation.project,
    goal: conversation.goal,
    contact: conversation.contact,
    reports: conversation.reports ?? [],
    messages: conversation.messages.map(
      (m: { id: string; role: string; content: string; createdAt: Date }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        createdAt: m.createdAt,
      })
    ),
  };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.conversation.delete({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
  });

  revalidatePath('/chat');
  return { success: true };
}

/**
 * Rename a conversation
 */
export async function renameConversation(conversationId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.conversation.update({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    data: { title },
  });

  revalidatePath('/chat');
  return { success: true };
}

/**
 * Update conversation context (project, goal, contact, and/or reports)
 */
export async function updateConversationContext(
  conversationId: string,
  projectId?: string | null,
  goalId?: string | null,
  contactId?: string | null,
  reportIds?: string[]
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const data: {
    projectId?: string | null;
    goalId?: string | null;
    contactId?: string | null;
    reports?: { set: { id: string }[] };
  } = {};
  if (projectId !== undefined) data.projectId = projectId;
  if (goalId !== undefined) data.goalId = goalId;
  if (contactId !== undefined) data.contactId = contactId;
  if (reportIds !== undefined) {
    // Replace the full set of connected reports
    data.reports = {
      set: reportIds.map(id => ({ id })),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.conversation as any).update({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    data,
  });

  revalidatePath('/chat');
  return { success: true };
}
