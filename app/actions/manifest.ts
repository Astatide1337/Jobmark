"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OpenAI } from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function getManifestationContent() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      goal: "Inner Peace",
      affirmations: [
        "I am calm and centered.",
        "Things happen for me, not to me.",
        "I attract positivity and growth."
      ],
      vision: "Your mind is a garden. Thoughts are seeds. You can grow flowers or you can grow weeds."
    };
  }

  // Fetch user context
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  const goals = await prisma.goal.findMany({
    where: { 
      userId: session.user.id,
      // We could add an 'isActive' check if schema supported it, but for now take recent
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Determine the primary focus
  const primaryGoal = settings?.primaryGoal || goals[0]?.title || "Personal Growth";
  const why = settings?.whyStatement || goals[0]?.why || "To become the best version of myself.";

  try {
    const completion = await openai.chat.completions.create({
      model: "xiaomi/mimo-v2-flash:free", // Using the free model as per project convention
      messages: [
        {
          role: "system",
          content: `You are a manifestation guide inspired by Brian Tracy and Earl Nightingale. 
          Your task is to generate 3 short, powerful, present-tense affirmations and 1 closing vision statement based on the user's goal.
          
          Output format (JSON):
          {
            "affirmations": ["Affirmation 1", "Affirmation 2", "Affirmation 3"],
            "vision": "A short, poetic 1-sentence closing statement about their future reality."
          }
          
          Tone: Empowering, calm, certainty, "I am" statements.`
        },
        {
          role: "user",
          content: `User Goal: "${primaryGoal}". Why: "${why}". Generate the manifestation content.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      goal: primaryGoal,
      affirmations: content.affirmations || [
        `I am fully aligned with ${primaryGoal}.`,
        "I take action every day towards my success.",
        "My potential is limitless."
      ],
      vision: content.vision || "Your future is created by what you do today."
    };

  } catch (error) {
    console.error("AI Manifestation Error:", error);
    // Fallback content
    return {
      goal: primaryGoal,
      affirmations: [
        "I am capable of achieving anything I set my mind to.",
        "Challenges are opportunities for me to grow.",
        "I am moving forward with confidence and clarity."
      ],
      vision: "Trust the process. Your time is coming."
    };
  }
}

export async function logManifestationSession(goal: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultProjectId: true }
  });

  // Log as an activity
  await prisma.activity.create({
    data: {
      userId: session.user.id,
      content: `Completed Manifestation Ritual for: ${goal}`,
      projectId: user?.defaultProjectId,
    }
  });
}
