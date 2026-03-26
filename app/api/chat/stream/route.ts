/**
 * AI Chat Streaming Route
 *
 * Why: Providing a "real-time" feel is critical for the AI Mentor experience.
 * This route handles the persistent connection between the user and the
 * LLM (via OpenRouter).
 *
 * Complex Logic:
 * - Context Injection: Uses the Strategy Pattern to build a specialized
 *   prompt based on the user's selected projects, goals, or reports.
 * - Stream Management: Tracks every active request in the `StreamManager`
 *   to handle manual cancellations and browser disconnects.
 * - Auto-Titling: If it's a new conversation, it triggers a secondary
 *   AI call to generate a relevant title based on the first message.
 */
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDate, getChannelLabel } from '@/lib/network';
import { buildContextString } from '@/lib/chat/context-providers';
import { buildSystemPrompt } from '@/lib/chat/system-prompts';
import { streamManager } from '@/lib/chat/stream-manager';
import type { ConversationMode } from '@/app/actions/chat';

/**
 * Lazy OpenAI client factory.
 *
 * Why: Module-level `new OpenAI()` throws at import time when
 * `OPENROUTER_API_KEY` is absent (build, cold boot, test environments).
 * Deferring to call-time means the module loads cleanly and only fails
 * when an actual AI request is made.
 */
function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

type StreamBody = {
  conversationId?: string;
  userMessage?: string;
  requestId?: string;
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  if (!conversationId || !userMessage || !requestId) {
    return NextResponse.json(
      { error: 'conversationId, userMessage, and requestId are required' },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = await (prisma.conversation as any).findUnique({
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

  await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content: userMessage,
    },
  });

  const contextString = await buildContextString(
    {
      mode: conversation.mode,
      projectId: conversation.projectId,
      goalId: conversation.goalId,
      contactId: conversation.contactId,
      reportIds: (conversation.reports ?? []).map((r: { id: string }) => r.id),
    },
    session.user.id
  );

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: buildSystemPrompt(conversation.mode as ConversationMode, contextString),
    },
  ];

  for (const message of conversation.messages.slice(-20)) {
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

      try {
        const completion = await getOpenAI().chat.completions.create(
          {
            model: 'z-ai/glm-4.5-air:free',
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
        request.signal.removeEventListener('abort', handleClientAbort);
        streamManager.unregister(requestId);

        try {
          if (fullResponse.trim().length > 0) {
            await prisma.message.create({
              data: {
                conversationId,
                role: 'assistant',
                content: fullResponse,
              },
            });
          }

          const updateData: { updatedAt: Date; title?: string } = {
            updatedAt: new Date(),
          };

          if (
            conversation.messages.length === 0 &&
            (conversation.title === 'New Chat' ||
              conversation.title === 'Goal Setting Session' ||
              conversation.title === 'Mock Interview')
          ) {
            try {
              const titleCompletion = await getOpenAI().chat.completions.create(
                {
                  model: 'z-ai/glm-4.5-air:free',
                  messages: [
                    {
                      role: 'system',
                      content:
                        'Generate a very short title (3-6 words) for this conversation. Return ONLY the title, nothing else.',
                    },
                    { role: 'user', content: userMessage },
                  ],
                },
                {
                  signal: upstreamController.signal,
                }
              );

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
