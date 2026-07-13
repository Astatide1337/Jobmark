import 'server-only';

import { prisma } from '@/lib/db';

export const CHAT_REQUEST_STALE_MS = 10 * 60 * 1000;

export class ChatRequestConflictError extends Error {}

export type AcquireChatRequestInput = {
  conversationId: string;
  userId: string;
  requestId: string;
  targetMessageId?: string;
  existingUserIdToClaim?: string;
  shouldCreateUserMessage: boolean;
  userMessage: string;
  now?: Date;
};

export type AcquiredChatRequest = {
  userMessageId?: string;
  createdUserMessage: boolean;
  reusedStaleUserMessage: boolean;
};

/** Atomically acquire a new, failed, cancelled, or stale request claim. */
export async function acquireChatRequest(
  input: AcquireChatRequestInput
): Promise<AcquiredChatRequest> {
  const now = input.now ?? new Date();
  const staleCutoff = new Date(now.getTime() - CHAT_REQUEST_STALE_MS);

  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.chatRequest.findUnique({
        where: {
          conversationId_requestId: {
            conversationId: input.conversationId,
            requestId: input.requestId,
          },
        },
      });

      let claimId: string;
      let userMessageId = input.existingUserIdToClaim;
      let createdUserMessage = false;
      let reusedStaleUserMessage = false;

      if (existing) {
        const acquired = await tx.chatRequest.updateMany({
          where: {
            id: existing.id,
            OR: [
              { status: { in: ['failed', 'cancelled'] } },
              { status: 'in_progress', updatedAt: { lte: staleCutoff } },
            ],
          },
          data: {
            status: 'in_progress',
            updatedAt: now,
            error: null,
            assistantMessageId: null,
            targetMessageId: input.targetMessageId ?? existing.targetMessageId,
          },
        });
        if (acquired.count !== 1) {
          throw new ChatRequestConflictError('This chat request is already in progress');
        }
        claimId = existing.id;

        if (existing.status === 'in_progress' && existing.userMessageId) {
          const staleUser = await tx.message.findFirst({
            where: {
              id: existing.userMessageId,
              conversationId: input.conversationId,
              role: 'user',
              content: input.userMessage,
            },
            select: { id: true },
          });
          if (!staleUser) throw new ChatRequestConflictError('Stale chat turn no longer matches');
          userMessageId = staleUser.id;
          createdUserMessage = existing.createdUserMessage;
          reusedStaleUserMessage = true;
        }
      } else {
        const created = await tx.chatRequest.create({
          data: {
            conversationId: input.conversationId,
            userId: input.userId,
            requestId: input.requestId,
            targetMessageId: input.targetMessageId,
          },
        });
        claimId = created.id;
      }

      if (userMessageId) {
        await tx.message.update({
          where: { id: userMessageId, conversationId: input.conversationId },
          data: { clientRequestId: input.requestId, cancelledAt: null },
        });
      } else if (input.shouldCreateUserMessage) {
        const userMessage = await tx.message.create({
          data: {
            conversationId: input.conversationId,
            role: 'user',
            content: input.userMessage,
            clientRequestId: input.requestId,
            cancelledAt: null,
          },
        });
        userMessageId = userMessage.id;
        createdUserMessage = true;
      }

      await tx.chatRequest.update({
        where: { id: claimId },
        data: { userMessageId, createdUserMessage },
      });

      return { userMessageId, createdUserMessage, reusedStaleUserMessage };
    });
  } catch (error) {
    if (
      error instanceof ChatRequestConflictError ||
      (error as { code?: string })?.code === 'P2002'
    ) {
      throw new ChatRequestConflictError('This chat request is already in progress');
    }
    throw error;
  }
}

/** Release an active claim, free its regeneration target, and clean its user turn. */
export async function releaseChatRequest(
  conversationId: string,
  requestId: string,
  status: 'failed' | 'cancelled',
  errorMessage?: string
): Promise<boolean> {
  return prisma.$transaction(async tx => {
    const claim = await tx.chatRequest.findUnique({
      where: { conversationId_requestId: { conversationId, requestId } },
    });
    if (!claim || !['in_progress', status].includes(claim.status)) return false;

    if (claim.status === 'in_progress') {
      const transitioned = await tx.chatRequest.updateMany({
        where: { id: claim.id, status: 'in_progress' },
        data: {
          status,
          updatedAt: new Date(),
          error: errorMessage?.slice(0, 1000) ?? null,
          targetMessageId: null,
        },
      });
      if (transitioned.count !== 1) return false;
    } else {
      await tx.chatRequest.update({
        where: { id: claim.id },
        data: { targetMessageId: null, error: errorMessage?.slice(0, 1000) ?? claim.error },
      });
    }

    if (claim.createdUserMessage && claim.userMessageId) {
      await tx.message.deleteMany({
        where: { id: claim.userMessageId, conversationId, clientRequestId: requestId },
      });
    } else if (claim.userMessageId) {
      await tx.message.updateMany({
        where: { id: claim.userMessageId, conversationId, clientRequestId: requestId },
        data: { clientRequestId: null },
      });
    }
    await tx.chatRequest.update({
      where: { id: claim.id },
      data: { userMessageId: null, createdUserMessage: false },
    });
    return true;
  });
}

/** Finalize only when this request still owns the active claim. */
export async function finalizeChatRequest(input: {
  conversationId: string;
  requestId: string;
  assistantContent: string;
  assistantIdToDelete?: string;
}): Promise<{ completed: boolean; assistantMessageId?: string }> {
  return prisma.$transaction(async tx => {
    const owned = await tx.chatRequest.updateMany({
      where: {
        conversationId: input.conversationId,
        requestId: input.requestId,
        status: 'in_progress',
      },
      data: { status: 'finalizing', updatedAt: new Date() },
    });
    if (owned.count !== 1) return { completed: false };

    const replacement = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        role: 'assistant',
        content: input.assistantContent,
        responseRequestId: input.requestId,
      },
    });
    if (input.assistantIdToDelete) {
      await tx.message.delete({
        where: { id: input.assistantIdToDelete, conversationId: input.conversationId },
      });
    }
    await tx.chatRequest.updateMany({
      where: {
        conversationId: input.conversationId,
        requestId: input.requestId,
        status: 'finalizing',
      },
      data: { status: 'completed', assistantMessageId: replacement.id, error: null },
    });
    return { completed: true, assistantMessageId: replacement.id };
  });
}
