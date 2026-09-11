/**
 * Settings domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { JobmarkActor, assertActor, ValidationError } from './index';
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

export type SettingsInput = z.infer<typeof settingsUpdateSchema>;

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
  };
}

export async function updateSettings(
  actor: JobmarkActor,
  input: SettingsInput
): Promise<SettingsDTO> {
  assertActor(actor);

  const result = settingsUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const { goalDeadline, ...settingsFields } = result.data;
  let normalizedGoalDeadline: Date | null | undefined;
  if (goalDeadline !== undefined) {
    normalizedGoalDeadline = goalDeadline ? new Date(goalDeadline) : null;
  }
  const data = {
    ...settingsFields,
    goalDeadline: normalizedGoalDeadline,
  };

  await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, ...data },
    update: data,
  });

  return getSettings(actor);
}
