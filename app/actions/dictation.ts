/**
 * Dictation actions
 *
 * Why: Speech-to-text is often messy and lacks punctuation. This action
 * applies a small, predictable cleanup pass locally on the server. Users can
 * still open a connected AI app for a more substantial rewrite.
 */
'use server';

import { auth } from '@/lib/auth';

/**
 * Cleans raw dictation text without contacting an external model service.
 */
export async function polishDictation(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  if (!text || text.trim().length === 0) return '';
  const normalized = text.slice(0, 20_000).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return capitalized.replace(/([.!?])(?=\S)/g, '$1 ');
}
