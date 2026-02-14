"use server";

import { auth } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Polishes raw dictation text using a free LLM.
 * Fixes punctuation, capitalization, and grammar while preserving meaning.
 */
export async function polishDictation(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!text || text.trim().length === 0) return "";

  try {
    const completion = await openai.chat.completions.create({
      model: "z-ai/glm-4.5-air:free",
      messages: [
        {
          role: "system",
          content: "You are an expert editor. You will be provided with raw text from a speech-to-text dictation. Your job is to format it into clear, professional text. Fix punctuation, capitalization, and minor grammar errors. Do NOT change the meaning or style significantly. Return ONLY the polished text.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.3, // Low temperature for consistent formatting
    });

    return completion.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error("Dictation polish error:", error);
    // Fallback to original text if AI fails
    return text;
  }
}
