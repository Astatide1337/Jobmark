/**
 * User Settings & Data Governance Actions
 *
 * Why: This is the central hub for user personalization and privacy.
 * It manages everything from UI themes to data export/account deletion.
 *
 * Key Responsibility:
 * Ensures "Data Portability" (GDPR compliance) by providing the `exportUserData`
 * action, which bundles a user's entire history into a single JSON object.
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, filterLockedReports } from '@/lib/project-lock';
import { revalidatePath } from 'next/cache';
import { encryptApiKey, decryptApiKey } from '@/lib/ai-key';
import {
  PROVIDER_CONFIGS,
  isValidProvider,
  type AIProvider,
} from '@/lib/ai-config';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserSettingsData = {
  // Goals
  primaryGoal: string | null;
  goalDeadline: Date | null;
  whyStatement: string | null;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;

  // Reports
  defaultTone: string;
  customInstructions: string | null;

  // Appearance
  themePreset: string;
  themeMode: string;

  // Preferences
  hideArchived: boolean;
  showConfetti: boolean;

  // Multi-provider BYOK
  aiProvider: AIProvider;
  aiModel: string | null;
  /** Map of provider → whether a key is saved (never the key itself) */
  aiKeysByProvider: Partial<Record<AIProvider, boolean>>;
};

/**
 * Resolved AI configuration for a single call site.
 * Returned by `getUserAiConfig()` and consumed by every AI call site.
 */
export interface AiConfig {
  provider: AIProvider;
  model: string;
  /** Decrypted BYOK key, or null if using the server env-var fallback */
  apiKey: string | null;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Safely casts a Prisma JsonValue to a plain string-map.
 * Returns {} for null, arrays, or non-objects so callers never crash.
 */
function parseAiKeys(raw: Prisma.JsonValue): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, string>;
}

// ---------------------------------------------------------------------------
// Read settings
// ---------------------------------------------------------------------------

export async function getUserSettings(userId?: string): Promise<UserSettingsData | null> {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) return null;
    targetUserId = session.user.id;
  }

  let settings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
  });

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: targetUserId },
    });
  }

  const provider: AIProvider = isValidProvider(settings.aiProvider)
    ? settings.aiProvider
    : 'gemini';

  const aiKeys = parseAiKeys(settings.aiKeys ?? null);
  const aiKeysByProvider: Partial<Record<AIProvider, boolean>> = {};
  for (const [p, val] of Object.entries(aiKeys)) {
    if (isValidProvider(p) && typeof val === 'string' && val.length > 0) {
      aiKeysByProvider[p] = true;
    }
  }

  return {
    primaryGoal: settings.primaryGoal,
    goalDeadline: settings.goalDeadline,
    whyStatement: settings.whyStatement,
    dailyTarget: settings.dailyTarget,
    weeklyTarget: settings.weeklyTarget,
    monthlyTarget: settings.monthlyTarget,
    defaultTone: settings.defaultTone,
    customInstructions: settings.customInstructions,
    themePreset: settings.themePreset,
    themeMode: settings.themeMode,
    hideArchived: settings.hideArchived,
    showConfetti: settings.showConfetti,
    aiProvider: provider,
    aiModel: settings.aiModel,
    aiKeysByProvider,
  };
}

// ---------------------------------------------------------------------------
// AI Config resolution (used by all AI call sites)
// ---------------------------------------------------------------------------

/**
 * getUserAiConfig
 *
 * Why: Single entry point for resolving which provider/model/key to use.
 * All AI call sites call this once (before any stream is created) and then
 * pass the result directly to `createAIClient`. This keeps auth logic out of
 * individual call sites and prevents IDOR — the session is always derived here.
 */
export async function getUserAiConfig(): Promise<AiConfig> {
  const session = await auth();

  // If unauthenticated, fall back to Gemini defaults with no user key
  if (!session?.user?.id) {
    return {
      provider: 'gemini',
      model: PROVIDER_CONFIGS.gemini.defaultModel,
      apiKey: null,
    };
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { aiProvider: true, aiModel: true, aiKeys: true },
  });

  const provider: AIProvider =
    settings && isValidProvider(settings.aiProvider) ? settings.aiProvider : 'gemini';

  const config = PROVIDER_CONFIGS[provider];

  // Validate stored model against the provider's model list; fall back to default
  const storedModel = settings?.aiModel ?? null;
  const validModel = storedModel && config.models.some(m => m.id === storedModel)
    ? storedModel
    : config.defaultModel;

  // Decrypt the stored key for this provider
  const aiKeys = parseAiKeys(settings?.aiKeys ?? null);
  const encryptedKey = aiKeys[provider];
  const apiKey = encryptedKey ? (decryptApiKey(encryptedKey) ?? null) : null;

  return { provider, model: validModel, apiKey };
}

// ---------------------------------------------------------------------------
// Save / delete provider API keys
// ---------------------------------------------------------------------------

/**
 * saveProviderApiKey
 *
 * Encrypts and stores the user's key for a specific provider, then sets that
 * provider as active. "Save = activate" is the simplest UX.
 */
export async function saveProviderApiKey(
  provider: AIProvider,
  rawKey: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  if (!rawKey.trim()) return { success: false, message: 'Key cannot be empty' };

  const trimmedKey = rawKey.trim();
  const config = PROVIDER_CONFIGS[provider];

  if (!trimmedKey.startsWith(config.keyPrefix) || trimmedKey.length < config.keyMinLength) {
    return {
      success: false,
      message: `Invalid key format. ${config.label} keys start with "${config.keyPrefix}" and must be at least ${config.keyMinLength} characters.`,
    };
  }

  try {
    const encrypted = encryptApiKey(trimmedKey);

    // Fetch existing keys, merge the new one in
    const existing = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { aiKeys: true },
    });
    const existingKeys = parseAiKeys(existing?.aiKeys ?? null);
    const updatedKeys = { ...existingKeys, [provider]: encrypted };

    // Reset aiModel to null when switching providers so getUserAiConfig always
    // falls back to the new provider's clean default instead of a stale model ID.
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: { aiKeys: updatedKeys, aiProvider: provider, aiModel: null },
      create: { userId: session.user.id, aiKeys: updatedKeys, aiProvider: provider },
    });

    revalidatePath('/settings');
    return { success: true, message: `${config.label} key saved and activated` };
  } catch (error) {
    console.error('Failed to save provider API key:', error);
    return { success: false, message: 'Failed to save API key' };
  }
}

/**
 * deleteProviderApiKey
 *
 * Removes a provider's key. If the deleted provider was active, resets to Gemini.
 */
export async function deleteProviderApiKey(
  provider: AIProvider
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    const existing = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { aiKeys: true, aiProvider: true },
    });

    const existingKeys = parseAiKeys(existing?.aiKeys ?? null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [provider]: _removed, ...remainingKeys } = existingKeys;
    // Prisma requires Prisma.JsonNull (not plain null) to explicitly clear a Json? field
    const updatedKeys: Record<string, string> | typeof Prisma.JsonNull =
      Object.keys(remainingKeys).length > 0 ? remainingKeys : Prisma.JsonNull;

    // If the deleted provider was active, fall back to gemini
    const currentProvider = existing?.aiProvider ?? 'gemini';
    const newProvider = currentProvider === provider ? 'gemini' : currentProvider;

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: { aiKeys: updatedKeys, aiProvider: newProvider },
      create: { userId: session.user.id },
    });

    revalidatePath('/settings');
    return { success: true, message: `${PROVIDER_CONFIGS[provider].label} key removed` };
  } catch (error) {
    console.error('Failed to delete provider API key:', error);
    return { success: false, message: 'Failed to delete API key' };
  }
}

/**
 * updateAiSettings
 *
 * Updates provider/model selection without touching stored keys.
 * Used by the model selector "Apply" button in Settings.
 */
export async function updateAiSettings(data: {
  aiProvider?: AIProvider;
  aiModel?: string | null;
}): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    revalidatePath('/settings');
    return { success: true, message: 'AI settings updated' };
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return { success: false, message: 'Failed to update AI settings' };
  }
}

// ---------------------------------------------------------------------------
// Other settings actions (unchanged)
// ---------------------------------------------------------------------------

export async function updateGoalSettings(data: {
  primaryGoal?: string;
  goalDeadline?: Date | null;
  whyStatement?: string;
  dailyTarget?: number;
  weeklyTarget?: number;
  monthlyTarget?: number;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    if (data.monthlyTarget !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { monthlyActivityGoal: data.monthlyTarget },
      });
    }

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'Goals updated' };
  } catch (error) {
    console.error('Failed to update goal settings:', error);
    return { success: false, message: 'Failed to update settings' };
  }
}

export async function updateReportSettings(data: {
  defaultTone?: string;
  customInstructions?: string | null;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    revalidatePath('/settings');
    revalidatePath('/reports');
    return { success: true, message: 'Report settings updated' };
  } catch (error) {
    console.error('Failed to update report settings:', error);
    return { success: false, message: 'Failed to update settings' };
  }
}

export async function updateAppearanceSettings(data: {
  themePreset?: string;
  themeMode?: string;
  hideArchived?: boolean;
  showConfetti?: boolean;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true, message: 'Appearance updated' };
  } catch (error) {
    console.error('Failed to update appearance settings:', error);
    return { success: false, message: 'Failed to update settings' };
  }
}

export async function exportUserData() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const lockedIds = await getLockedProjectIds(session.user.id);

  const [user, projects, activities, reports, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: {
        userId: session.user.id,
        ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
      },
      select: {
        name: true,
        color: true,
        description: true,
        archived: true,
        createdAt: true,
      },
    }),
    prisma.activity.findMany({
      where: {
        userId: session.user.id,
        ...(lockedIds.length > 0 && {
          OR: [
            { projectId: null },
            { projectId: { notIn: lockedIds } },
          ],
        }),
      },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.report.findMany({
      where: { userId: session.user.id },
      select: { title: true, content: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const filteredReports = filterLockedReports(reports, lockedIds);

  // Exclude encrypted keys from the export — they must never leave the server.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { aiKeys: _keys, ...safeSettings } = settings ?? {};

  return {
    exportedAt: new Date().toISOString(),
    user,
    settings: safeSettings,
    projects,
    activities: activities.map(a => ({
      content: a.content,
      logDate: a.logDate,
      createdAt: a.createdAt,
      project: a.project?.name || null,
    })),
    reports: filteredReports,
  };
}

export async function clearAllActivities() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    await prisma.activity.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath('/dashboard');
    revalidatePath('/insights');
    revalidatePath('/projects');
    return { success: true, message: 'All activities cleared' };
  } catch (error) {
    console.error('Failed to clear activities:', error);
    return { success: false, message: 'Failed to clear activities' };
  }
}

export async function deleteUserAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return { success: true, message: 'Account deleted' };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, message: 'Failed to delete account' };
  }
}
