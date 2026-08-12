/**
 * Focus and decompression domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, ValidationError } from './index';
import { deterministicRewrite } from '@/lib/deterministic-drafts';
import { z } from 'zod';

const focusConfigSchema = z.object({
  enabled: z.boolean(),
  workDuration: z.number().min(1).max(120),
  breakDuration: z.number().min(1).max(60),
  longBreakDuration: z.number().min(1).max(120),
  sessionsUntilLongBreak: z.number().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartWork: z.boolean(),
  soundEnabled: z.boolean(),
  soundVolume: z.number().min(0).max(1),
  dailyTarget: z.number().min(1).max(20),
});

const decompressionLogSchema = z.object({
  durationMinutes: z.number().min(1).max(480),
  moodBefore: z.number().min(1).max(10),
  moodAfter: z.number().min(1).max(10),
  notes: z.string().optional().nullable(),
});

const dictationPolishSchema = z.object({
  text: z.string().min(1),
  instructions: z.string().optional().nullable(),
});

export type FocusConfigInput = z.infer<typeof focusConfigSchema>;
export type DecompressionLogInput = z.infer<typeof decompressionLogSchema>;
export type DictationPolishInput = z.infer<typeof dictationPolishSchema>;

export type FocusConfigDTO = {
  enabled: boolean;
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  dailyTarget: number;
  updatedAt: string;
};

export async function getFocusConfig(actor: JobmarkActor): Promise<FocusConfigDTO> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { focusConfig: true, updatedAt: true },
  });

  const config = (settings?.focusConfig as FocusConfigInput) ?? {
    enabled: true,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    soundEnabled: true,
    soundVolume: 0.5,
    dailyTarget: 4,
  };

  return {
    ...config,
    updatedAt: settings?.updatedAt.toISOString() ?? new Date().toISOString(),
  };
}

export async function saveFocusConfig(
  actor: JobmarkActor,
  input: FocusConfigInput
): Promise<FocusConfigDTO> {
  assertActor(actor);

  const result = focusConfigSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    update: { focusConfig: result.data },
    create: { userId: actor.userId, focusConfig: result.data },
    select: { updatedAt: true, focusConfig: true },
  });

  return {
    ...(settings.focusConfig as FocusConfigInput),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function resetFocusConfig(actor: JobmarkActor): Promise<FocusConfigDTO> {
  assertActor(actor);

  const defaultConfig: FocusConfigInput = {
    enabled: true,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    soundEnabled: true,
    soundVolume: 0.5,
    dailyTarget: 4,
  };

  const settings = await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    update: { focusConfig: defaultConfig },
    create: { userId: actor.userId, focusConfig: defaultConfig },
    select: { updatedAt: true, focusConfig: true },
  });

  return {
    ...(settings.focusConfig as FocusConfigInput),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function logDecompression(
  actor: JobmarkActor,
  input: DecompressionLogInput
): Promise<{ id: string; createdAt: string }> {
  assertActor(actor);

  const result = decompressionLogSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const log = await prisma.decompressionLog.create({
    data: {
      userId: actor.userId,
      durationMinutes: result.data.durationMinutes,
      moodBefore: result.data.moodBefore,
      moodAfter: result.data.moodAfter,
      notes: result.data.notes ?? null,
    },
    select: { id: true, createdAt: true },
  });

  return { id: log.id, createdAt: log.createdAt.toISOString() };
}

export async function polishDictation(
  actor: JobmarkActor,
  input: DictationPolishInput
): Promise<{ polishedText: string }> {
  assertActor(actor);

  const result = dictationPolishSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  return { polishedText: deterministicRewrite(result.data.text, 'Clean up this dictation.') };
}
