/**
 * Dictation AI Actions
 *
 * Why: Speech-to-text is often messy and lacks punctuation. This action
 * provides a "Polish" layer using an LLM (via Google Gemini) to
 * transform raw voice transcripts into professional written accomplishments.
 *
 * Model Choice: `DEFAULT_MODEL` is used for consistent model management
 * across all AI call sites, with BYOK support for user-supplied keys.
 */
'use server';

import { auth } from '@/lib/auth';
import { createAIClient, DEFAULT_MODEL } from '@/lib/ai';
import { getUserApiKey } from '@/app/actions/settings';

/**
 * Polishes raw dictation text using a free LLM.
 * Fixes punctuation, capitalization, and grammar while preserving meaning.
 */
export async function polishDictation(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (!text || text.trim().length === 0) return '';

  try {
    const userKey = await getUserApiKey();
    const ai = createAIClient(userKey);
    const completion = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
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
