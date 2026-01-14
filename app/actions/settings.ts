"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
};

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  let settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: session.user.id },
    });
  }

  return settings;
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
    return { success: false, message: "Unauthorized" };
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

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, message: "Goals updated" };
  } catch (error) {
    console.error("Failed to update goal settings:", error);
    return { success: false, message: "Failed to update settings" };
  }
}

export async function updateReportSettings(data: {
  defaultTone?: string;
  customInstructions?: string | null;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    revalidatePath("/settings");
    revalidatePath("/reports");
    return { success: true, message: "Report settings updated" };
  } catch (error) {
    console.error("Failed to update report settings:", error);
    return { success: false, message: "Failed to update settings" };
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
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, message: "Appearance updated" };
  } catch (error) {
    console.error("Failed to update appearance settings:", error);
    return { success: false, message: "Failed to update settings" };
  }
}

export async function exportUserData() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const [user, projects, activities, reports, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { userId: session.user.id },
      select: {
        name: true,
        color: true,
        description: true,
        archived: true,
        createdAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { userId: session.user.id },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { userId: session.user.id },
      select: { title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    settings,
    projects,
    activities: activities.map((a) => ({
      content: a.content,
      logDate: a.logDate,
      createdAt: a.createdAt,
      project: a.project?.name || null,
    })),
    reports,
  };
}

export async function clearAllActivities() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.activity.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/insights");
    revalidatePath("/projects");
    return { success: true, message: "All activities cleared" };
  } catch (error) {
    console.error("Failed to clear activities:", error);
    return { success: false, message: "Failed to clear activities" };
  }
}

export async function deleteUserAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // Delete user and all related data (cascades defined in schema)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return { success: true, message: "Account deleted" };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, message: "Failed to delete account" };
  }
}
