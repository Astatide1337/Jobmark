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

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { FocusBlock } from '@/lib/focus/types';
import { getDefaultFocusConfig } from '@/lib/focus/defaults';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFocusConfig(raw: unknown): FocusBlock[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return getDefaultFocusConfig();
  }
  try {
    const valid = (raw as unknown[]).every(
      b =>
        b &&
        typeof b === 'object' &&
        'id' in (b as object) &&
        'type' in (b as object) &&
        'config' in (b as object)
    );
    if (!valid) return getDefaultFocusConfig();
    return raw as FocusBlock[];
  } catch {
    return getDefaultFocusConfig();
  }
}

// ---------------------------------------------------------------------------
// getFocusConfig
// ---------------------------------------------------------------------------

export async function getFocusConfig(userId?: string): Promise<FocusBlock[]> {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) return getDefaultFocusConfig();
    targetUserId = session.user.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = await (prisma.userSettings as any).findUnique({
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
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { success: false, error: 'At least one block is required' };
  }

  if (blocks.length > 30) {
    return { success: false, error: 'Maximum 30 blocks allowed' };
  }

  for (const block of blocks) {
    if (!block.id || !block.type || !block.config) {
      return { success: false, error: 'Invalid block structure' };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.userSettings as any).upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      focusConfig: blocks as object[],
    },
    update: {
      focusConfig: blocks as object[],
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.userSettings as any).upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, focusConfig: null },
    update: { focusConfig: null },
  });

  revalidatePath('/settings');
  revalidatePath('/focus');
  return { success: true };
}
