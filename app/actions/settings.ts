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

  // BYOK
  hasGeminiApiKey: boolean;
};

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
    hasGeminiApiKey: !!settings.geminiApiKey,
  };
}

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
    // Update UserSettings for the settings page
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    // Also update the User's monthlyActivityGoal for the dashboard stats
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
        // Exclude locked projects from export when vault is closed
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

  return {
    exportedAt: new Date().toISOString(),
    user,
    settings,
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
    // Delete user and all related data (cascades defined in schema)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return { success: true, message: 'Account deleted' };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, message: 'Failed to delete account' };
  }
}

/**
 * saveUserApiKey
 *
 * Why: Stores the user's personal Gemini API key, encrypted at rest,
 * so AI features run under their own quota rather than the shared server key.
 */
export async function saveUserApiKey(
  rawKey: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  if (!rawKey.trim()) return { success: false, message: 'Key cannot be empty' };

  const encrypted = encryptApiKey(rawKey.trim());

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { geminiApiKey: encrypted },
    create: { userId: session.user.id, geminiApiKey: encrypted },
  });

  revalidatePath('/settings');
  return { success: true, message: 'API key saved' };
}

/**
 * deleteUserApiKey
 *
 * Why: Allows users to remove their personal key and revert to the shared server key.
 */
export async function deleteUserApiKey(): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { geminiApiKey: null },
    create: { userId: session.user.id },
  });

  revalidatePath('/settings');
  return { success: true, message: 'API key removed' };
}

/**
 * getUserApiKey
 *
 * Why: Decrypts and returns the user's stored API key for use in AI call sites.
 * Returns null if no key is stored, triggering the server-key fallback.
 * Accepts an optional userId so Route Handlers (which aren't server actions)
 * can pass the session userId directly.
 */
export async function getUserApiKey(userId?: string): Promise<string | null> {
  const targetId = userId ?? (await auth())?.user?.id;
  if (!targetId) return null;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: targetId },
    select: { geminiApiKey: true },
  });

  if (!settings?.geminiApiKey) return null;
  return decryptApiKey(settings.geminiApiKey);
}
