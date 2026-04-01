/**
 * Shared AI Client Factory
 *
 * Why Gemini: jobmark is migrating its AI backbone to Google Gemini for the public
 * launch. We point the OpenAI-compatible SDK at Gemini's OpenAI-compatibility layer
 * so all existing chat/completion call sites need zero code changes — only this one
 * module needs updating.
 *
 * Why `apiKey` is optional: jobmark supports Bring-Your-Own-Key (BYOK). Users who
 * supply their own Gemini key in Settings have it stored encrypted in the DB. Those
 * callers decrypt it and pass it here; everyone else gets `null`/`undefined` and
 * falls back to the server-level `GEMINI_API_KEY` environment variable.
 *
 * Why `DEFAULT_MODEL` is exported: keeping a single canonical string here prevents
 * model-name drift across call sites (chat stream, report generation, text polishing).
 * To upgrade the model for the whole app, change it in exactly one place.
 */

import OpenAI from 'openai';

const GEMINI_BASE_URL = 'https://generativeai.googleapis.com/v1beta/openai/';

/** The default Gemini model used for all AI calls unless a site overrides it. */
export const DEFAULT_MODEL = 'gemini-2.0-flash-lite';

/**
 * Create an OpenAI-compatible client pointed at Google Gemini.
 *
 * @param apiKey - Optional user-supplied Gemini API key (BYOK). Pass `null` or
 *   `undefined` to fall back to the `GEMINI_API_KEY` environment variable.
 * @returns A configured OpenAI client instance ready for chat completions.
 */
export function createAIClient(apiKey?: string | null): OpenAI {
  const key = apiKey ?? process.env.GEMINI_API_KEY ?? '';
  return new OpenAI({
    baseURL: GEMINI_BASE_URL,
    apiKey: key,
  });
}
