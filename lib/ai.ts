/**
 * Shared AI Client Factory
 *
 * Why multi-provider: jobmark supports Bring-Your-Own-Key (BYOK) for multiple
 * AI providers. Users pick their preferred provider and model in Settings; their
 * encrypted key is decrypted at call time and passed here. When no user key is
 * present we fall back to the matching server-level environment variable.
 *
 * Why OpenAI SDK for all providers: every supported provider exposes an
 * OpenAI-compatible REST API, so we only need one SDK. The `baseURL` and
 * optional `defaultHeaders` (e.g. Anthropic's version header) are the only
 * things that differ between providers.
 *
 * Why `getProviderDefaultModel`: keeping a single canonical default per
 * provider in `PROVIDER_CONFIGS` prevents model-name drift across call sites.
 */

import OpenAI from 'openai';
import { PROVIDER_CONFIGS, type AIProvider } from '@/lib/ai-config';

/**
 * Returns the default model ID for a given provider.
 * Replaces the old `DEFAULT_MODEL` constant — each provider now has its own.
 */
export function getProviderDefaultModel(provider: AIProvider): string {
  return PROVIDER_CONFIGS[provider].defaultModel;
}

/**
 * Create an OpenAI-compatible client pointed at the given provider.
 *
 * @param provider - Which AI provider to target (gemini, openai, anthropic, groq, openrouter).
 * @param apiKey   - Optional user-supplied BYOK key. Pass `null`/`undefined` to
 *                   fall back to the provider's server-level env var.
 * @returns A configured OpenAI client instance ready for chat completions.
 */
export function createAIClient(provider: AIProvider, apiKey?: string | null): OpenAI {
  const config = PROVIDER_CONFIGS[provider];
  const key = apiKey ?? process.env[config.envVar];

  if (!key) {
    console.warn(
      `[jobmark] No API key available for provider "${provider}" — AI calls will fail with 401. ` +
        `Set ${config.envVar} in your environment or save a key in Settings.`
    );
  }

  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: key ?? '',
    ...(config.extraHeaders ? { defaultHeaders: config.extraHeaders } : {}),
  });
}
