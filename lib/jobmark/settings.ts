/**
 * Settings domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, ValidationError, UserActionRequiredError } from './index';
import { z } from 'zod';

const settingsUpdateSchema = z.object({
  // Goals
  primaryGoal: z.string().max(500).optional().nullable(),
  goalDeadline: z.string().datetime().optional().nullable(),
  whyStatement: z.string().optional().nullable(),
  dailyTarget: z.number().int().min(1).max(100).optional(),
  weeklyTarget: z.number().int().min(1).max(500).optional(),
  monthlyTarget: z.number().int().min(1).max(2000).optional(),

  // Reports
  defaultTone: z.string().optional(),
  customInstructions: z.string().optional().nullable(),

  // Appearance
  themePreset: z.string().optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),

  // Preferences
  hideArchived: z.boolean().optional(),
  showConfetti: z.boolean().optional(),

  // Timezone
  timeZone: z.string().optional(),
});

const aiKeyManageSchema = z.object({
  provider: z.string(),
  action: z.enum(['set', 'remove']),
});

export type SettingsInput = z.infer<typeof settingsUpdateSchema>;
export type AIKeyManageInput = z.infer<typeof aiKeyManageSchema>;

export type SettingsDTO = {
  // Goals
  primaryGoal: string | null;
  goalDeadline: string | null;
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

  // Timezone
  timeZone: string;

  // AI
  aiProvider: string;
  aiModel: string | null;
  aiKeysConfigured: string[];
};

export async function getSettings(actor: JobmarkActor): Promise<SettingsDTO> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
  });

  if (!settings) {
    // Return defaults
    return {
      primaryGoal: null,
      goalDeadline: null,
      whyStatement: null,
      dailyTarget: 3,
      weeklyTarget: 15,
      monthlyTarget: 40,
      defaultTone: 'professional',
      customInstructions: null,
      themePreset: 'cafe',
      themeMode: 'dark',
      hideArchived: false,
      showConfetti: true,
      timeZone: 'America/New_York',
      aiProvider: 'gemini',
      aiModel: null,
      aiKeysConfigured: [],
    };
  }

  return {
    primaryGoal: settings.primaryGoal,
    goalDeadline: settings.goalDeadline?.toISOString() ?? null,
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
    timeZone: settings.timeZone,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiKeysConfigured: (settings.aiKeys as Record<string, string> | null) ? Object.keys(settings.aiKeys as Record<string, string>) : [],
  };
}

export async function updateSettings(actor: JobmarkActor, input: SettingsInput): Promise<SettingsDTO> {
  assertActor(actor);

  const result = settingsUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const data: any = { ...result.data };
  if (data.goalDeadline) data.goalDeadline = new Date(data.goalDeadline);

  await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, ...data },
    update: data,
  });

  return getSettings(actor);
}

export async function manageAIKeys(actor: JobmarkActor, input: AIKeyManageInput): Promise<{ actionUrl: string; expiresAt: string }> {
  assertActor(actor);

  const result = aiKeyManageSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  // For security, AI key management requires browser flow
  const nonce = await createSecureActionNonce(actor.userId, actor.connectionId, `ai_key_${result.data.action}`);
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/ai-keys?nonce=${nonce}&provider=${result.data.provider}&action=${result.data.action}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  throw new UserActionRequiredError(
    `Open Jobmark to ${result.data.action === 'set' ? 'add' : 'remove'} your ${result.data.provider} API key`,
    actionUrl,
    expiresAt
  );
}

async function createSecureActionNonce(
  userId: string,
  connectionId: string | undefined,
  type: string
): Promise<string> {
  const nonce = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
  // Store in database with hash, expiry, user, connection, type
  return nonce;
}