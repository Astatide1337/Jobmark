import OpenAI from "openai";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, getChannelLabel } from "@/lib/network";
import {
  buildProjectContext,
  buildGoalContext,
  buildContactContext,
  buildUserSummary,
  buildInterviewContext,
} from "@/app/actions/chat-context";
import { buildSystemPrompt } from "@/lib/chat/system-prompts";
import {
  cleanupStaleChatStreams,
  registerChatStream,
  unregisterChatStream,
} from "@/lib/chat/stream-registry";
import type { ConversationMode } from "@/app/actions/chat";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

type StreamBody = {
  conversationId?: string;
  userMessage?: string;
  requestId?: string;
};

type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; cancelled: boolean }
  | { type: "error"; message: string };

function toEventLine(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { name?: string; message?: string };
  if (maybeError.name === "AbortError") return true;

  const message = maybeError.message?.toLowerCase();
  return Boolean(message && message.includes("abort"));
}

async function buildContextString(conversation: {
  mode: string;
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
}): Promise<string> {
  let contextString = "";

  const userSummary = await buildUserSummary();
  if (userSummary) {
    contextString += `\n\nUser Profile:\n- Name: ${userSummary.name || "User"}\n- Total logged activities: ${userSummary.totalActivities}\n- Active projects: ${userSummary.totalProjects}\n- Current streak: ${userSummary.currentStreak} days\n- Goals set: ${userSummary.goalsCount}`;
  }

  if (conversation.projectId) {
    if (conversation.mode === "interview") {
      const interviewContext = await buildInterviewContext(conversation.projectId);
      if (interviewContext) {
        contextString += `\n\nProject for Interview: "${interviewContext.projectName}"`;
        if (interviewContext.projectDescription) {
          contextString += `\nDescription: ${interviewContext.projectDescription}`;
        }
        contextString += `\nTotal activities: ${interviewContext.activityCount}`;
        contextString += `\n\nRecent Work (use these for context-specific questions):\n${interviewContext.activityTimeline}`;
      }
    } else {
      const projectContext = await buildProjectContext(conversation.projectId);
      if (projectContext) {
        contextString += `\n\nReferenced Project: "${projectContext.name}"`;
        if (projectContext.description) {
          contextString += `\nDescription: ${projectContext.description}`;
        }
        contextString += `\nActivities logged: ${projectContext.activityCount}`;
        if (projectContext.recentActivities.length > 0) {
          contextString += `\nRecent work:\n${projectContext.recentActivities
            .slice(0, 5)
            .map((activity) => `- ${activity.content}`)
            .join("\n")}`;
        }
      }
    }
  }

  if (conversation.goalId) {
    const goalContext = await buildGoalContext(conversation.goalId);
    if (goalContext) {
      contextString += `\n\nReferenced Goal: "${goalContext.title}"`;
      if (goalContext.deadline) {
        contextString += `\nDeadline: ${goalContext.deadline.toLocaleDateString()}`;
      }
      if (goalContext.why) {
        contextString += `\nWhy it matters: ${goalContext.why}`;
      }
    }
  }

  if (conversation.contactId) {
    const contactContext = await buildContactContext(conversation.contactId);
    if (contactContext) {
      contextString += `\n\nReferenced Contact: "${contactContext.fullName}"`;
      if (contactContext.relationship) {
        contextString += `\nRelationship: ${contactContext.relationship}`;
      }
      if (contactContext.personalityTraits) {
        contextString += `\nPersonality/Traits: ${contactContext.personalityTraits}`;
      }
      if (contactContext.notes) {
        contextString += `\nNotes: ${contactContext.notes}`;
      }

      if (contactContext.recentInteractions.length > 0) {
        contextString += "\n\nRecent Interactions:";
        for (const interaction of contactContext.recentInteractions) {
          const dateStr = formatDate(interaction.occurredAt);
          const channelStr = getChannelLabel(interaction.channel);
          contextString += `\n- ${dateStr} (${channelStr}): ${interaction.summary}`;
          if (interaction.nextStep) {
            contextString += `\n  Next: ${interaction.nextStep}`;
          }
          if (interaction.followUpDate) {
            contextString += `\n  Follow-up: ${formatDate(interaction.followUpDate)}`;
          }
        }
      }
    }
  }

  if (conversation.mode === "goal-coach" && userSummary?.recentGoals.length) {
    contextString += `\n\nExisting Goals:\n${userSummary.recentGoals
      .map((goal) => `- ${goal.title}${goal.deadline ? ` (due ${goal.deadline.toLocaleDateString()})` : ""}`)
      .join("\n")}`;
  }

  return contextString;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StreamBody;
  try {
    body = (await request.json()) as StreamBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  const userMessage = body.userMessage?.trim();
  const requestId = body.requestId?.trim();

  if (!conversationId || !userMessage || !requestId) {
    return NextResponse.json(
      { error: "conversationId, userMessage, and requestId are required" },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  const contextString = await buildContextString({
    mode: conversation.mode,
    projectId: conversation.projectId,
    goalId: conversation.goalId,
    contactId: conversation.contactId,
  });

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: buildSystemPrompt(conversation.mode as ConversationMode, contextString),
    },
  ];

  for (const message of conversation.messages.slice(-20)) {
    if (message.role === "user" || message.role === "assistant") {
      chatMessages.push({
        role: message.role,
        content: message.content,
      });
    }
  }

  chatMessages.push({
    role: "user",
    content: `---\n${userMessage}\n---`,
  });

  const upstreamController = new AbortController();
  const handleClientAbort = () => {
    upstreamController.abort("client-disconnected");
  };

  if (request.signal.aborted) {
    handleClientAbort();
  } else {
    request.signal.addEventListener("abort", handleClientAbort, { once: true });
  }

  cleanupStaleChatStreams();
  registerChatStream({
    requestId,
    userId: session.user.id,
    conversationId,
    controller: upstreamController,
    startedAt: Date.now(),
  });

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      let wasCancelled = false;

      try {
        const completion = await openai.chat.completions.create(
          {
            model: "z-ai/glm-4.5-air:free",
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

          const content = chunk.choices[0]?.delta?.content || "";
          if (!content) continue;

          fullResponse += content;
          controller.enqueue(toEventLine({ type: "delta", content }));
        }
      } catch (error) {
        if (isAbortError(error) || upstreamController.signal.aborted) {
          wasCancelled = true;
        } else {
          console.error("Chat stream route error:", error);
          controller.enqueue(
            toEventLine({
              type: "error",
              message: "Sorry, I encountered an error. Please try again.",
            })
          );
        }
      } finally {
        request.signal.removeEventListener("abort", handleClientAbort);
        unregisterChatStream(requestId);

        try {
          if (fullResponse.trim().length > 0) {
            await prisma.message.create({
              data: {
                conversationId,
                role: "assistant",
                content: fullResponse,
              },
            });
          }

          const updateData: { updatedAt: Date; title?: string } = {
            updatedAt: new Date(),
          };

          if (
            conversation.messages.length === 0 &&
            (conversation.title === "New Chat" ||
              conversation.title === "Goal Setting Session" ||
              conversation.title === "Mock Interview")
          ) {
            try {
              const titleCompletion = await openai.chat.completions.create(
                {
                  model: "z-ai/glm-4.5-air:free",
                  messages: [
                    {
                      role: "system",
                      content:
                        "Generate a very short title (3-6 words) for this conversation. Return ONLY the title, nothing else.",
                    },
                    { role: "user", content: userMessage },
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
                console.error("Failed to generate chat title:", titleError);
              }
            }
          }

          await prisma.conversation.update({
            where: { id: conversationId },
            data: updateData,
          });

          revalidatePath("/chat");
        } catch (finalizeError) {
          console.error("Failed to finalize chat stream:", finalizeError);
        }

        controller.enqueue(toEventLine({ type: "done", cancelled: wasCancelled }));
        controller.close();
      }
    },

    cancel() {
      upstreamController.abort("stream-cancelled-by-client");
      request.signal.removeEventListener("abort", handleClientAbort);
      unregisterChatStream(requestId);
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
