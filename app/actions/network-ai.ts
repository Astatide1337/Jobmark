"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStreamableValue } from "@ai-sdk/rsc";
import OpenAI from "openai";
import { formatDate } from "@/lib/network";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const OUTREACH_SYSTEM_PROMPT = `You are a professional networking assistant. Generate a draft message ONLY. Never fabricate details about the contact. Use only the facts provided. If information is insufficient, note what's missing. This is a DRAFT for the user to review and send themselves.

Guidelines:
- Keep the tone consistent with the requested style
- For email channel, include a Subject line at the top
- Reference real details from the contact profile and interaction history
- Do NOT invent accomplishments, shared experiences, or mutual connections
- If the objective is unclear or context is thin, produce a shorter, safer draft and flag what extra info would help`;

// ---------------------------------------------------------------------------
// Streaming outreach draft generation
// ---------------------------------------------------------------------------

export async function generateOutreachDraft({
  contactId,
  objective,
  tone,
  channel,
  extraContext,
}: {
  contactId: string;
  objective: string;
  tone: string;
  channel: string;
  extraContext?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Fetch contact + recent interactions for context
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, userId: session.user.id },
    include: {
      interactions: {
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Build context block from real data
  let contactContext = `Contact Profile:\n- Name: ${contact.fullName}`;
  if (contact.relationship) contactContext += `\n- Relationship: ${contact.relationship}`;
  if (contact.personalityTraits) contactContext += `\n- Personality traits: ${contact.personalityTraits}`;
  if (contact.notes) contactContext += `\n- Notes: ${contact.notes}`;
  if (contact.email) contactContext += `\n- Email: ${contact.email}`;

  if (contact.interactions.length > 0) {
    contactContext += `\n\nRecent Interactions:`;
    for (const interaction of contact.interactions) {
      contactContext += `\n- [${formatDate(interaction.occurredAt)}] (${interaction.channel}) ${interaction.summary}`;
      if (interaction.nextStep) contactContext += ` | Next step: ${interaction.nextStep}`;
    }
  } else {
    contactContext += `\n\nNo prior interactions logged.`;
  }

  const userPrompt = `${contactContext}

Objective: ${objective}
Tone: ${tone}
Channel: ${channel}${extraContext ? `\nAdditional context: ${extraContext}` : ""}

Generate the outreach draft now.`;

  const stream = createStreamableValue("");

  (async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: "z-ai/glm-4.5-air:free",
        messages: [
          { role: "system", content: OUTREACH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          stream.update(content);
        }
      }
    } catch (err) {
      console.error("Outreach draft stream error:", err);
      stream.error(err);
    } finally {
      stream.done();
    }
  })();

  return { output: stream.value };
}

// ---------------------------------------------------------------------------
// Non-streaming draft improvement
// ---------------------------------------------------------------------------

export async function improveOutreachDraft(
  selectedText: string,
  instruction: string
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "xiaomi/mimo-v2-flash:free",
      messages: [
        {
          role: "system",
          content:
            "You are a writing assistant. Rewrite the provided text according to the user's instruction. Return ONLY the rewritten text, nothing else.",
        },
        {
          role: "user",
          content: `Original text:\n${selectedText}\n\nInstruction: ${instruction}`,
        },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() ?? selectedText;
  } catch (error) {
    console.error("Failed to improve draft:", error);
    throw new Error("Failed to improve draft. Please try again.");
  }
}
