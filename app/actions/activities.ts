"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const activitySchema = z.object({
  content: z.string().min(10, "Activity must be at least 10 characters").max(1000),
  projectId: z.string().optional().nullable(),
  logDate: z.date().optional(),
});

export type ActivityFormState = {
  success: boolean;
  message: string;
  errors?: {
    content?: string[];
    projectId?: string[];
  };
};

export async function createActivity(
  prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in to log activities" };
  }

  const rawData = {
    content: formData.get("content") as string,
    projectId: formData.get("projectId") as string | null,
    logDate: formData.get("logDate") 
      ? new Date(formData.get("logDate") as string) 
      : new Date(),
  };

  const result = activitySchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        content: result.data.content,
        projectId: result.data.projectId || null,
        logDate: result.data.logDate || new Date(),
      },
    });

    revalidatePath("/dashboard");
    
    return { success: true, message: "Activity logged successfully" };
  } catch (error) {
    console.error("Failed to create activity:", error);
    return { success: false, message: "Failed to save activity. Please try again." };
  }
}

export async function getActivities(limit = 20, offset = 0, hideArchived = false) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  const activities = await prisma.activity.findMany({
    where: { 
      userId: session.user.id,
      ...(hideArchived && {
        OR: [
          { projectId: null }, // Activities without a project
          { project: { archived: false } }, // Activities from non-archived projects
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      project: {
        select: { id: true, name: true, color: true, archived: true },
      },
    },
  });

  return activities;
}

export async function getActivityCount() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return 0;
  }

  return prisma.activity.count({
    where: { userId: session.user.id },
  });
}

export async function deleteActivity(activityId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.activity.delete({
      where: { 
        id: activityId,
        userId: session.user.id, // Ensure user owns this activity
      },
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Activity deleted" };
  } catch (error) {
    console.error("Failed to delete activity:", error);
    return { success: false, message: "Failed to delete activity" };
  }
}

export async function getActivityStats() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { 
      thisMonth: 0, 
      today: 0,
      thisWeek: 0,
      recentDates: [], 
      projects: 0, 
      monthlyGoal: 20,
      dailyGoal: 3,
      weeklyGoal: 15,
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Get start of week (Sunday = 0)
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

  const [user, settings, thisMonthCount, todayCount, thisWeekCount, projectCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { monthlyActivityGoal: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { dailyTarget: true, weeklyTarget: true },
    }),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        logDate: { gte: startOfMonth },
      },
    }),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        logDate: { gte: startOfDay },
      },
    }),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        logDate: { gte: startOfWeek },
      },
    }),
    prisma.project.count({
      where: {
        userId: session.user.id,
        archived: false,
      },
    }),
  ]);

  // Use createdAt (actual creation timestamp) for streak - more reliable than logDate
  const recentActivities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 365,
  });

  // Return full ISO timestamps - client will convert to local dates
  const recentDates = recentActivities.map(a => a.createdAt.toISOString());

  return {
    thisMonth: thisMonthCount,
    today: todayCount,
    thisWeek: thisWeekCount,
    recentDates,
    projects: projectCount,
    monthlyGoal: user?.monthlyActivityGoal ?? 20,
    dailyGoal: settings?.dailyTarget ?? 3,
    weeklyGoal: settings?.weeklyTarget ?? 15,
  };
}
