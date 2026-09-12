/**
 * Focus and decompression domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, ValidationError } from './index';
import { deterministicRewrite } from '@/lib/deterministic-drafts';
import { z } from 'zod';
import { getDefaultFocusConfig } from '@/lib/focus/defaults';
import { focusConfigSchema, type FocusConfig } from '@/lib/focus/schema';
import type { FocusBlock } from '@/lib/focus/types';

const decompressionLogSchema = z
  .object({
    durationMinutes: z.number().min(1).max(480),
    moodBefore: z.number().min(1).max(10),
    moodAfter: z.number().min(1).max(10),
    notes: z.string().max(10_000).optional().nullable(),
  })
  .strict();

const dictationPolishSchema = z
  .object({
    text: z.string().min(1).max(5_000),
    instructions: z.string().max(2_000).optional().nullable(),
  })
  .strict();

export type FocusConfigInput = FocusConfig;
export type DecompressionLogInput = z.infer<typeof decompressionLogSchema>;
export type DictationPolishInput = z.infer<typeof dictationPolishSchema>;

export type FocusConfigDTO = {
  blocks: FocusBlock[];
  updatedAt: string;
};

export async function getFocusConfig(actor: JobmarkActor): Promise<FocusConfigDTO> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { focusConfig: true, updatedAt: true },
  });

  const parsed = focusConfigSchema.safeParse(settings?.focusConfig);
  const blocks = parsed.success ? parsed.data : getDefaultFocusConfig();

  return {
    blocks,
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
    throw new ValidationError('Validation failed', {
      focusConfig: result.error.issues.map(issue => issue.message),
    });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    update: { focusConfig: result.data },
    create: { userId: actor.userId, focusConfig: result.data },
    select: { updatedAt: true, focusConfig: true },
  });

  return {
    blocks: focusConfigSchema.parse(settings.focusConfig),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function resetFocusConfig(actor: JobmarkActor): Promise<FocusConfigDTO> {
  assertActor(actor);

  const defaultConfig: FocusConfigInput = getDefaultFocusConfig();

  const settings = await prisma.userSettings.upsert({
    where: { userId: actor.userId },
    update: { focusConfig: defaultConfig },
    create: { userId: actor.userId, focusConfig: defaultConfig },
    select: { updatedAt: true, focusConfig: true },
  });

  return {
    blocks: focusConfigSchema.parse(settings.focusConfig),
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
