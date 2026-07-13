/**
 * AI Chat Streaming Route
 *
 * Why: Providing a "real-time" feel is critical for the AI Mentor experience.
 * This route handles the persistent connection between the user and the
 * LLM (via Google Gemini).
 *
 * Complex Logic:
 * - Context Injection: Uses the Strategy Pattern to build a specialized
 *   prompt based on the user's selected projects, goals, or reports.
 * - Stream Management: Tracks every active request in the `StreamManager`
 *   to handle manual cancellations and browser disconnects.
 * - Auto-Titling: If it's a new conversation, it triggers a secondary
 *   AI call to generate a relevant title based on the first message.
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDate, getChannelLabel } from '@/lib/network';
import { buildContextString } from '@/lib/chat/context-providers';
import { buildSystemPrompt } from '@/lib/chat/system-prompts';
import { streamManager } from '@/lib/chat/stream-manager';
import { AIConfigurationError, createAIClient } from '@/lib/ai';
import { getUserAiConfig } from '@/app/actions/settings';
import type { ConversationMode } from '@/app/actions/chat';
import { prepareTurn } from '@/lib/chat/turn-persistence';
import { assertAiRequestAllowed } from '@/lib/ai-rate-limit';

type StreamBody = {
  conversationId?: string;
  userMessage?: string;
  requestId?: string;
  regenerateMessageId?: string;
  reuseExistingUserTurn?: boolean;
};

type StreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; cancelled: boolean }
  | { type: 'error'; message: string };

function toEventLine(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { name?: string; message?: string };
  if (maybeError.name === 'AbortError') return true;

  const message = maybeError.message?.toLowerCase();
  return Boolean(message && message.includes('abort'));
}

const STALE_REQUEST_MS = 10 * 60 * 1000;

class ChatRequestConflictError extends Error {}

type ChatClaim = {
  userMessageId?: string;
  createdUserMessage: boolean;
};

async function claimChatRequest(options: {
  conversationId: string;
  userId: string;
  requestId: string;
  targetMessageId?: string;
  preparedTurn: ReturnType<typeof prepareTurn>;
  userMessage: string;
}): Promise<ChatClaim> {
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.chatRequest.findUnique({
        where: {
          conversationId_requestId: {
            conversationId: options.conversationId,
            requestId: options.requestId,
          },
        },
      });
      if (existing?.status === 'completed') {
        throw new ChatRequestConflictError('This chat request is already complete');
      }
      if (
        existing?.status === 'in_progress' &&
        Date.now() - existing.updatedAt.getTime() < STALE_REQUEST_MS
      ) {
        throw new ChatRequestConflictError('This chat request is already in progress');
      }

      const claim = existing
        ? await tx.chatRequest.update({
            where: { id: existing.id },
            data: {
              status: 'in_progress',
              error: null,
              targetMessageId: options.targetMessageId ?? existing.targetMessageId,
              userMessageId: null,
              createdUserMessage: false,
            },
          })
        : await tx.chatRequest.create({
            data: {
              conversationId: options.conversationId,
              userId: options.userId,
              requestId: options.requestId,
              targetMessageId: options.targetMessageId,
            },
          });

      let userMessageId = options.preparedTurn.existingUserIdToClaim;
      let createdUserMessage = false;
      if (userMessageId) {
        await tx.message.update({
          where: { id: userMessageId, conversationId: options.conversationId },
          data: { clientRequestId: options.requestId, cancelledAt: null },
        });
      } else if (options.preparedTurn.shouldCreateUserMessage) {
        const userMessageRow = await tx.message.create({
          data: {
            conversationId: options.conversationId,
            role: 'user',
            content: options.userMessage,
            clientRequestId: options.requestId,
            cancelledAt: null,
          },
        });
        userMessageId = userMessageRow.id;
        createdUserMessage = true;
      }

      await tx.chatRequest.update({
        where: { id: claim.id },
        data: { userMessageId, createdUserMessage },
      });
      return { userMessageId, createdUserMessage };
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

async function releaseChatRequest(
  conversationId: string,
  requestId: string,
  status: 'failed' | 'cancelled',
  errorMessage?: string
) {
  await prisma.$transaction(async tx => {
    const claim = await tx.chatRequest.findUnique({
      where: { conversationId_requestId: { conversationId, requestId } },
    });
    if (!claim) return;
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
      data: { status, error: errorMessage?.slice(0, 1000) ?? null },
    });
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await assertAiRequestAllowed(session.user.id, 'chat');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI request limit reached' },
      { status: 429 }
    );
  }

  let body: StreamBody;
  try {
    body = (await request.json()) as StreamBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  const userMessage = body.userMessage?.trim();
  const requestId = body.requestId?.trim();
  const regenerateMessageId = body.regenerateMessageId?.trim();
  const reuseExistingUserTurn = body.reuseExistingUserTurn === true;

  if (!conversationId || !userMessage || !requestId) {
    return NextResponse.json(
      { error: 'conversationId, userMessage, and requestId are required' },
      { status: 400 }
    );
  }
  if (requestId.length > 120) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }
  if (userMessage.length > 8_000) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 413 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      reports: { select: { id: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const completedResponse = await prisma.message.findFirst({
    where: { conversationId, responseRequestId: requestId, role: 'assistant' },
    select: { content: true },
  });
  if (completedResponse) {
    return new Response(
      `${JSON.stringify({ type: 'delta', content: completedResponse.content })}\n${JSON.stringify({ type: 'done', cancelled: false })}\n`,
      {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  const claimedUser = await prisma.message.findFirst({
    where: { conversationId, clientRequestId: requestId, role: 'user' },
    select: { id: true },
  });
  if (claimedUser) {
    return NextResponse.json(
      { error: 'This chat request is already in progress' },
      { status: 409 }
    );
  }

  const existingClaim = await prisma.chatRequest.findUnique({
    where: { conversationId_requestId: { conversationId, requestId } },
  });
  if (existingClaim?.status === 'completed') {
    const persistedResponse = await prisma.message.findFirst({
      where: {
        id: existingClaim.assistantMessageId ?? undefined,
        conversationId,
        role: 'assistant',
      },
      select: { content: true },
    });
    if (persistedResponse) {
      return new Response(
        `${JSON.stringify({ type: 'delta', content: persistedResponse.content })}\n${JSON.stringify({ type: 'done', cancelled: false })}\n`,
        {
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }
  }
  if (
    existingClaim?.status === 'in_progress' &&
    Date.now() - existingClaim.updatedAt.getTime() < STALE_REQUEST_MS
  ) {
    return NextResponse.json(
      { error: 'This chat request is already in progress' },
      { status: 409 }
    );
  }

  let preparedTurn;
  try {
    preparedTurn = prepareTurn(conversation.messages, {
      userMessage,
      regenerateMessageId,
      reuseExistingUserTurn,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid chat turn' },
      { status: 409 }
    );
  }
  const historyMessages = preparedTurn.history;
  try {
    await claimChatRequest({
      conversationId,
      userId: session.user.id,
      requestId,
      targetMessageId: preparedTurn.assistantIdToDelete,
      preparedTurn,
      userMessage,
    });
  } catch (error) {
    if (error instanceof ChatRequestConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Failed to claim chat request:', error);
    return NextResponse.json({ error: 'Chat request could not be claimed' }, { status: 503 });
  }

  let contextString: string;
  try {
    contextString = await buildContextString(
      {
        mode: conversation.mode,
        projectId: conversation.projectId,
        goalId: conversation.goalId,
        contactId: conversation.contactId,
        reportIds: (conversation.reports ?? []).map((r: { id: string }) => r.id),
      },
      session.user.id
    );
  } catch (error) {
    await releaseChatRequest(conversationId, requestId, 'failed', 'Context construction failed');
    console.error('Failed to build chat context:', error);
    return NextResponse.json({ error: 'Chat context is temporarily unavailable' }, { status: 503 });
  }

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: buildSystemPrompt(conversation.mode as ConversationMode, contextString),
    },
  ];

  for (const message of historyMessages.slice(-20)) {
    if (message.role === 'user' || message.role === 'assistant') {
      chatMessages.push({
        role: message.role,
        content: message.content,
      });
    }
  }

  chatMessages.push({
    role: 'user',
    content: `---\n${userMessage}\n---`,
  });

  // Resolve AI config for BYOK support — must happen before ReadableStream construction
  // so `ai` and `model` are captured in the stream/auto-title closures.
  let ai: ReturnType<typeof createAIClient>;
  let model: string;
  try {
    const config = await getUserAiConfig();
    model = config.model;
    ai = createAIClient(config.provider, config.apiKey);
  } catch (error) {
    await releaseChatRequest(conversationId, requestId, 'failed', 'AI configuration failed');
    if (error instanceof AIConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Failed to resolve AI configuration:', error);
    return NextResponse.json({ error: 'AI service is temporarily unavailable' }, { status: 503 });
  }

  const upstreamController = new AbortController();
  const handleClientAbort = () => {
    upstreamController.abort('client-disconnected');
  };

  if (request.signal.aborted) {
    handleClientAbort();
  } else {
    request.signal.addEventListener('abort', handleClientAbort, { once: true });
  }

  streamManager.cleanupStale();
  streamManager.register({
    requestId,
    userId: session.user.id,
    conversationId,
    controller: upstreamController,
    startedAt: Date.now(),
  });

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      let wasCancelled = false;
      let generationSucceeded = false;
      const pollCancellation = async () => {
        try {
          const cancelledMessage = await prisma.message.findFirst({
            where: {
              conversationId,
              clientRequestId: requestId,
              role: 'user',
              cancelledAt: { not: null },
            },
            select: { id: true },
          });
          const cancelledRequest = await prisma.chatRequest.findFirst({
            where: { conversationId, requestId, status: 'cancelled' },
            select: { id: true },
          });
          if (cancelledMessage || cancelledRequest) upstreamController.abort('persisted-cancel');
        } catch (error) {
          console.error('Failed to poll chat cancellation state:', error);
        }
      };
      const cancellationPoll = setInterval(() => void pollCancellation(), 500);
      void pollCancellation();

      try {
        const completion = await ai.chat.completions.create(
          {
            model,
            messages: chatMessages,
            stream: true,
          },
          {
            signal: upstreamController.signal,
          }
        );

        for await (const chunk of completion) {
          if (upstreamController.signal.aborted) {
            wasCancelled = true;
            break;
          }

          const content = chunk.choices[0]?.delta?.content || '';
          if (!content) continue;

          fullResponse += content;
          controller.enqueue(toEventLine({ type: 'delta', content }));
        }
        generationSucceeded = !wasCancelled;
      } catch (error) {
        if (isAbortError(error) || upstreamController.signal.aborted) {
          wasCancelled = true;
        } else {
          console.error('Chat stream route error:', error);
          controller.enqueue(
            toEventLine({
              type: 'error',
              message: 'Sorry, I encountered an error. Please try again.',
            })
          );
        }
      } finally {
        clearInterval(cancellationPoll);
        request.signal.removeEventListener('abort', handleClientAbort);
        streamManager.unregister(requestId);

        try {
          if (generationSucceeded && fullResponse.trim().length > 0) {
            await prisma.$transaction(async tx => {
              const replacement = await tx.message.create({
                data: {
                  conversationId,
                  role: 'assistant',
                  content: fullResponse,
                  responseRequestId: requestId,
                },
              });
              if (preparedTurn.assistantIdToDelete) {
                await tx.message.delete({
                  where: { id: preparedTurn.assistantIdToDelete, conversationId },
                });
              }
              await tx.chatRequest.update({
                where: { conversationId_requestId: { conversationId, requestId } },
                data: { status: 'completed', assistantMessageId: replacement.id, error: null },
              });
            });
          } else {
            await releaseChatRequest(
              conversationId,
              requestId,
              wasCancelled ? 'cancelled' : 'failed',
              wasCancelled ? 'Cancelled by client' : 'No assistant response was generated'
            );
          }

          const updateData: { updatedAt: Date; title?: string } = {
            updatedAt: new Date(),
          };

          if (
            generationSucceeded &&
            !wasCancelled &&
            fullResponse.trim().length > 0 &&
            historyMessages.length === 0 &&
            (conversation.title === 'New Chat' ||
              conversation.title === 'Goal Setting Session' ||
              conversation.title === 'Mock Interview')
          ) {
            try {
              const titleCompletion = await ai.chat.completions.create({
                model,
                messages: [
                  {
                    role: 'system',
                    content:
                      'Generate a very short title (3-6 words) for this conversation. Return ONLY the title, nothing else.',
                  },
                  { role: 'user', content: userMessage },
                ],
              });

              const generatedTitle = titleCompletion.choices[0]?.message?.content?.trim();
              if (generatedTitle && generatedTitle.length < 50) {
                updateData.title = generatedTitle;
              }
            } catch (titleError) {
              if (!isAbortError(titleError)) {
                console.error('Failed to generate chat title:', titleError);
              }
            }
          }

          await prisma.conversation.update({
            where: { id: conversationId },
            data: updateData,
          });

          revalidatePath('/chat');
        } catch (finalizeError) {
          console.error('Failed to finalize chat stream:', finalizeError);
        }

        controller.enqueue(toEventLine({ type: 'done', cancelled: wasCancelled }));
        controller.close();
      }
    },

    cancel() {
      upstreamController.abort('stream-cancelled-by-client');
      request.signal.removeEventListener('abort', handleClientAbort);
      streamManager.unregister(requestId);
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
