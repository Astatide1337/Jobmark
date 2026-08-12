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

import { auth, requireUserId, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, filterLockedReports, isVaultUnlocked } from '@/lib/project-lock';
import { revalidatePath } from 'next/cache';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/lib/date-semantics';
import { z } from 'zod';
import { appearanceSettingsSchema, goalSettingsSchema } from '@/lib/input-schemas';

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
  timeZone: string;

  // Preferences
  hideArchived: boolean;
  showConfetti: boolean;
};

// ---------------------------------------------------------------------------
// Read settings
// ---------------------------------------------------------------------------

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const targetUserId = await requireUserId();

  // Route prefetching and React effects can request settings concurrently.
  // An atomic upsert avoids a unique-constraint race when the user's default
  // settings row has not been created yet.
  const settings = await prisma.userSettings.upsert({
    where: { userId: targetUserId },
    update: {},
    create: { userId: targetUserId },
  });

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
    timeZone: isValidTimeZone(settings.timeZone) ? settings.timeZone : DEFAULT_TIME_ZONE,
    hideArchived: settings.hideArchived,
    showConfetti: settings.showConfetti,
  };
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
  const parsed = goalSettingsSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Invalid goal settings' };
  const safeData = parsed.data;
  const numericFields = [safeData.dailyTarget, safeData.weeklyTarget, safeData.monthlyTarget];
  if (
    numericFields.some(
      value => value !== undefined && (!Number.isInteger(value) || value < 0 || value > 10_000)
    )
  ) {
    return { success: false, message: 'Goal targets must be whole numbers between 0 and 10,000' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: safeData,
      create: { userId: session.user.id, ...safeData },
    });

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
  const reportSettings = z
    .object({
      defaultTone: z.enum(['professional', 'casual', 'bullet-points']).optional(),
      customInstructions: z.string().max(4_000).nullable().optional(),
    })
    .safeParse(data);
  if (!reportSettings.success) return { success: false, message: 'Invalid report settings' };

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: reportSettings.data,
      create: { userId: session.user.id, ...reportSettings.data },
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
  timeZone?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }
  const parsed = appearanceSettingsSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Invalid appearance settings' };
  const safeData = parsed.data;
  if (safeData.timeZone && !isValidTimeZone(safeData.timeZone)) {
    return { success: false, message: 'Invalid timezone' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: safeData,
      create: { userId: session.user.id, ...safeData },
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
  if (lockedIds.length > 0 && !(await isVaultUnlocked(session.user.id))) {
    return { error: 'Unlock your vault before exporting all account data.' };
  }

  const [
    user,
    projects,
    activities,
    reports,
    settings,
    goals,
    contacts,
    interactions,
    outreachDrafts,
    conversations,
  ] = await Promise.all([
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
          OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
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
      select: {
        primaryGoal: true,
        goalDeadline: true,
        whyStatement: true,
        dailyTarget: true,
        weeklyTarget: true,
        monthlyTarget: true,
        defaultTone: true,
        customInstructions: true,
        themePreset: true,
        themeMode: true,
        timeZone: true,
        hideArchived: true,
        showConfetti: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        deadline: true,
        why: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        birthday: true,
        relationship: true,
        personalityTraits: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.interactionLog.findMany({
      where: { userId: session.user.id },
      orderBy: { occurredAt: 'asc' },
      select: {
        id: true,
        contactId: true,
        occurredAt: true,
        channel: true,
        summary: true,
        nextStep: true,
        followUpDate: true,
        rawNotes: true,
        createdAt: true,
      },
    }),
    prisma.outreachDraft.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        contactId: true,
        title: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.conversation.findMany({
      where: {
        userId: session.user.id,
        ...(lockedIds.length > 0 && {
          OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
        }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        project: { select: { id: true, name: true } },
        goal: { select: { id: true, title: true } },
        contact: { select: { id: true, fullName: true } },
        reports: { select: { id: true, title: true } },
      },
    }),
  ]);

  const filteredReports = filterLockedReports(reports, lockedIds);

  return {
    exportedAt: new Date().toISOString(),
    user,
    // Allowlist only user-facing preferences. Vault hashes, encrypted keys,
    // cryptographic metadata, and internal IDs are intentionally excluded.
    settings,
    projects,
    activities: activities.map(a => ({
      content: a.content,
      logDate: a.logDate,
      createdAt: a.createdAt,
      project: a.project?.name || null,
    })),
    reports: filteredReports,
    goals,
    contacts,
    interactions,
    outreachDrafts,
    conversations: conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      project: conversation.project,
      goal: conversation.goal,
      contact: conversation.contact,
      reports: conversation.reports,
      messages: conversation.messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })),
  };
}

export async function clearAllActivities(confirmation: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }
  if (confirmation !== 'CLEAR ALL ACTIVITIES') {
    return { success: false, message: 'Explicit confirmation is required' };
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

    // Clear the session cookie so the browser is signed out
    await signOut({ redirect: false });

    return { success: true, message: 'Account deleted' };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, message: 'Failed to delete account' };
  }
}
