/**
 * Focus Configuration Actions
 *
 * Why: jobmark allows users to customize their "Deep Work" ritual. This
 * module handles the persistence of those custom sequences (e.g.,
 * 2 mins Breathing -> 5 mins Goal Review).
 *
 * Technical Implementation:
 * We store the entire sequence as a JSONB array in the `userSettings` table.
 * This avoids a separate table for "blocks" while remaining highly flexible.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { FocusBlock } from '@/lib/focus/types';
import { getDefaultFocusConfig } from '@/lib/focus/defaults';
import { Prisma } from '@prisma/client';
import { focusConfigSchema } from '@/lib/focus/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFocusConfig(raw: unknown): FocusBlock[] {
  const parsed = focusConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : getDefaultFocusConfig();
}

// ---------------------------------------------------------------------------
// getFocusConfig
// ---------------------------------------------------------------------------

export async function getFocusConfig(): Promise<FocusBlock[]> {
  const targetUserId = await requireUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
    select: { focusConfig: true },
  });

  return parseFocusConfig(settings?.focusConfig);
}

// ---------------------------------------------------------------------------
// saveFocusConfig
// ---------------------------------------------------------------------------

export async function saveFocusConfig(
  blocks: FocusBlock[]
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Sign in to save your focus session.' };

  const parsed = focusConfigSchema.safeParse(blocks);
  if (!parsed.success) return { success: false, error: 'One focus block is not valid.' };

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      focusConfig: parsed.data as unknown as Prisma.InputJsonValue,
    },
    update: {
      focusConfig: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/settings');
  revalidatePath('/focus');
  return { success: true };
}

// ---------------------------------------------------------------------------
// resetFocusConfig
// ---------------------------------------------------------------------------

export async function resetFocusConfig(): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      focusConfig: getDefaultFocusConfig() as unknown as Prisma.InputJsonValue,
    },
    update: { focusConfig: getDefaultFocusConfig() as unknown as Prisma.InputJsonValue },
  });

  revalidatePath('/settings');
  revalidatePath('/focus');
  return { success: true };
}
