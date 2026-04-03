/**
 * Dictation AI Actions
 *
 * Why: Speech-to-text is often messy and lacks punctuation. This action
 * provides a "Polish" layer using an LLM to transform raw voice transcripts
 * into professional written accomplishments.
 *
 * Provider: Resolved at call time via `getUserAiConfig()` — the user's active
 * provider, model, and BYOK key (or server fallback) are all returned in one shot.
 */
'use server';

import { auth } from '@/lib/auth';
import { createAIClient } from '@/lib/ai';
import { getUserAiConfig } from '@/app/actions/settings';

/**
 * Polishes raw dictation text using the user's configured AI provider.
 * Fixes punctuation, capitalization, and grammar while preserving meaning.
 */
export async function polishDictation(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (!text || text.trim().length === 0) return '';

  try {
    const { provider, model, apiKey } = await getUserAiConfig();
    const ai = createAIClient(provider, apiKey);
    const completion = await ai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert editor. You will be provided with raw text from a speech-to-text dictation. Your job is to format it into clear, professional text. Fix punctuation, capitalization, and minor grammar errors. Do NOT change the meaning or style significantly. Return ONLY the polished text.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3, // Low temperature for consistent formatting
    });

    return completion.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('Dictation polish error:', error);
    // Fallback to original text if AI fails
    return text;
  }
}
