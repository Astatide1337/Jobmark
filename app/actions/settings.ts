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
import { getActivityDisplayContent } from '@/lib/jobmark/activity-copy';

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
    return { success: false, message: 'Sign in to update your goals.' };
  }
  const parsed = goalSettingsSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Check your goals and try again.' };
  const safeData = parsed.data;
  const numericFields = [safeData.dailyTarget, safeData.weeklyTarget, safeData.monthlyTarget];
  if (
    numericFields.some(
      value => value !== undefined && (!Number.isInteger(value) || value < 0 || value > 10_000)
    )
  ) {
    return { success: false, message: 'Targets must be whole numbers from 0 to 10,000.' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: safeData,
      create: { userId: session.user.id, ...safeData },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'Goal settings saved.' };
  } catch (error) {
    console.error('Failed to update goal settings:', error);
    return { success: false, message: 'Your settings were not saved. Try again.' };
  }
}

export async function updateReportSettings(data: {
  defaultTone?: string;
  customInstructions?: string | null;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to update your review settings.' };
  }
  const reportSettings = z
    .object({
      defaultTone: z.enum(['professional', 'casual', 'bullet-points']).optional(),
      customInstructions: z.string().max(4_000).nullable().optional(),
    })
    .safeParse(data);
  if (!reportSettings.success)
    return { success: false, message: 'Check your review settings and try again.' };

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: reportSettings.data,
      create: { userId: session.user.id, ...reportSettings.data },
    });

    revalidatePath('/settings');
    revalidatePath('/reports');
    return { success: true, message: 'Review settings saved.' };
  } catch (error) {
    console.error('Failed to update report settings:', error);
    return { success: false, message: 'Your settings were not saved. Try again.' };
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
    return { success: false, message: 'Sign in to update your appearance.' };
  }
  const parsed = appearanceSettingsSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, message: 'Check your appearance settings and try again.' };
  const safeData = parsed.data;
  if (safeData.timeZone && !isValidTimeZone(safeData.timeZone)) {
    return { success: false, message: 'Choose a valid time zone.' };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: safeData,
      create: { userId: session.user.id, ...safeData },
    });

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true, message: 'Appearance settings saved.' };
  } catch (error) {
    console.error('Failed to update appearance settings:', error);
    return { success: false, message: 'Your settings were not saved. Try again.' };
  }
}

export async function exportUserData() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const lockedIds = await getLockedProjectIds(session.user.id);
  if (lockedIds.length > 0 && !(await isVaultUnlocked(session.user.id))) {
    return { error: 'Open your private projects before exporting your data.' };
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
      content: getActivityDisplayContent(a.content),
      logDate: a.logDate,
      createdAt: a.createdAt,
      project: a.project?.name || null,
    })),
    reports: filteredReports,
    goals,
    contacts,
    interactions,
    outreachDrafts,
  };
}

export async function clearAllActivities(confirmation: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to clear your notes.' };
  }
  if (confirmation !== 'CLEAR ALL NOTES') {
    return { success: false, message: 'Confirm that you want to clear your notes.' };
  }

  try {
    await prisma.activity.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath('/dashboard');
    revalidatePath('/insights');
    revalidatePath('/projects');
    return { success: true, message: 'All notes cleared.' };
  } catch (error) {
    console.error('Failed to clear activities:', error);
    return { success: false, message: 'Your notes were not cleared. Try again.' };
  }
}

export async function deleteUserAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to delete your account.' };
  }

  try {
    const userId = session.user.id;
    const connections = await prisma.mcpConnection.findMany({
      where: { userId },
      select: { id: true },
    });
    const connectionIds = connections.map(connection => connection.id);

    await prisma.$transaction(async transaction => {
      if (connectionIds.length > 0) {
        await transaction.mcpIdempotency.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });
      }
      await transaction.secureActionNonce.deleteMany({ where: { userId } });
      await transaction.oAuthAuthorizationCode.deleteMany({ where: { userId } });
      await transaction.oAuthAccessToken.deleteMany({ where: { userId } });
      await transaction.oAuthRefreshToken.deleteMany({ where: { userId } });
      await transaction.oAuthConsent.deleteMany({ where: { userId } });
      await transaction.oAuthClient.deleteMany({ where: { userId } });
      await transaction.user.delete({
        where: { id: userId },
      });
    });

    // Clear the session cookie so the browser is signed out
    await signOut({ redirect: false });

    return { success: true, message: 'Your account was deleted.' };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, message: 'Your account was not deleted. Try again.' };
  }
}
