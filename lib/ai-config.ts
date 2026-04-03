/**
 * AI Provider Configuration
 *
 * Why: Centralises all provider-specific constants (endpoint, models, key format)
 * so that adding a new provider means touching exactly one file. The shape is
 * intentionally client-safe (no secrets) — it can be imported in both Server
 * Components and Client Components for the settings UI.
 *
 * Anthropic compatibility note: The Anthropic API requires an
 * `anthropic-version` header even when accessed via the OpenAI-compatible
 * endpoint. We pass it through `extraHeaders` which the OpenAI SDK surfaces as
 * `defaultHeaders` on the client instance.
 */

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter';

export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderConfig {
  label: string;
  baseURL: string;
  defaultModel: string;
  models: ModelOption[];
  /** Expected key prefix for basic format validation (e.g. "AIza", "sk-") */
  keyPrefix: string;
  /** Minimum key length for basic format validation */
  keyMinLength: number;
  /** Server-side env var name used as fallback when the user has no BYOK key */
  envVar: string;
  /** Link to the provider's API key management page (shown in UI) */
  docsUrl: string;
  /** Whether the provider offers a free tier (shown as badge in UI) */
  hasFreeTier: boolean;
  /** Extra HTTP headers required by the provider (e.g. Anthropic version header) */
  extraHeaders?: Record<string, string>;
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    label: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    keyPrefix: 'AIza',
    keyMinLength: 20,
    envVar: 'GEMINI_API_KEY',
    docsUrl: 'https://aistudio.google.com/apikey',
    hasFreeTier: true,
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    keyPrefix: 'sk-',
    keyMinLength: 20,
    envVar: 'OPENAI_API_KEY',
    docsUrl: 'https://platform.openai.com/api-keys',
    hasFreeTier: false,
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-haiku-3-5',
    models: [
      { id: 'claude-haiku-3-5', label: 'Claude Haiku 3.5' },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    ],
    keyPrefix: 'sk-ant-',
    keyMinLength: 30,
    envVar: 'ANTHROPIC_API_KEY',
    docsUrl: 'https://console.anthropic.com/keys',
    hasFreeTier: false,
    // Required by Anthropic even when using the OpenAI-compatible endpoint
    extraHeaders: { 'anthropic-version': '2023-06-01' },
  },
  groq: {
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
    keyPrefix: 'gsk_',
    keyMinLength: 20,
    envVar: 'GROQ_API_KEY',
    docsUrl: 'https://console.groq.com/keys',
    hasFreeTier: true,
  },
  openrouter: {
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
      { id: 'anthropic/claude-3-haiku', label: 'Claude Haiku 3' },
    ],
    keyPrefix: 'sk-or-',
    keyMinLength: 20,
    envVar: 'OPENROUTER_API_KEY',
    docsUrl: 'https://openrouter.ai/keys',
    hasFreeTier: true,
  },
};

/** Ordered list of providers for consistent iteration (e.g. UI selector row) */
export const AI_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic', 'groq', 'openrouter'];

/** Type guard — narrows an unknown string to AIProvider */
export function isValidProvider(value: string): value is AIProvider {
  return AI_PROVIDERS.includes(value as AIProvider);
}
