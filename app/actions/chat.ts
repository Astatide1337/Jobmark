"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Conversation modes
export type ConversationMode = "general" | "goal-coach" | "interview";

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
}

export interface MessageData {
  id: string;
  role: "user" | "assistant" | "system";
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
  mode: ConversationMode = "general",
  projectId?: string,
  goalId?: string,
  contactId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      mode,
      projectId: projectId || null,
      goalId: goalId || null,
      contactId: contactId || null,
      title: mode === "goal-coach" 
        ? "Goal Setting Session" 
        : mode === "interview" 
        ? "Mock Interview" 
        : "New Chat",
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
    },
  });

  revalidatePath("/chat");

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
  };
}

/**
 * Get list of user's conversations
 */
export async function getConversations(limit = 20): Promise<ConversationData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    mode: c.mode as ConversationMode,
    projectId: c.projectId,
    goalId: c.goalId,
    contactId: c.contactId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    project: c.project,
    goal: c.goal,
    contact: c.contact,
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

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      goal: { select: { id: true, title: true } },
      contact: { select: { id: true, fullName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
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
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.conversation.delete({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
  });

  revalidatePath("/chat");
  return { success: true };
}

/**
 * Rename a conversation
 */
export async function renameConversation(conversationId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.conversation.update({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    data: { title },
  });

  revalidatePath("/chat");
  return { success: true };
}

/**
 * Update conversation context (project, goal, or contact reference)
 */
export async function updateConversationContext(
  conversationId: string,
  projectId?: string | null,
  goalId?: string | null,
  contactId?: string | null
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const data: {
    projectId?: string | null;
    goalId?: string | null;
    contactId?: string | null;
  } = {};
  if (projectId !== undefined) data.projectId = projectId;
  if (goalId !== undefined) data.goalId = goalId;
  if (contactId !== undefined) data.contactId = contactId;

  await prisma.conversation.update({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    data,
  });

  revalidatePath("/chat");
  return { success: true };
}
