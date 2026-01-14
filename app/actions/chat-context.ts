"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Types for conversation context
export interface ProjectContext {
  id: string;
  name: string;
  description: string | null;
  color: string;
  activityCount: number;
  recentActivities: Array<{
    content: string;
    createdAt: Date;
  }>;
}

export interface GoalContext {
  id: string;
  title: string;
  deadline: Date | null;
  why: string | null;
  createdAt: Date;
}

export interface UserSummary {
  name: string | null;
  totalActivities: number;
  totalProjects: number;
  currentStreak: number;
  goalsCount: number;
  recentGoals: GoalContext[];
}

/**
 * Build context about a specific project for the AI
 */
export async function buildProjectContext(projectId: string): Promise<ProjectContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    include: {
      _count: { select: { activities: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true, createdAt: true },
      },
    },
  });

  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    activityCount: project._count.activities,
    recentActivities: project.activities,
  };
}

/**
 * Build context about a specific goal for the AI
 */
export async function buildGoalContext(goalId: string): Promise<GoalContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const goal = await prisma.goal.findUnique({
    where: {
      id: goalId,
      userId: session.user.id,
    },
  });

  if (!goal) return null;

  return {
    id: goal.id,
    title: goal.title,
    deadline: goal.deadline,
    why: goal.why,
    createdAt: goal.createdAt,
  };
}

/**
 * Build a summary of the user's overall profile for the AI
 */
export async function buildUserSummary(): Promise<UserSummary | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, activityCount, projectCount, goals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    }),
    prisma.activity.count({ where: { userId: session.user.id } }),
    prisma.project.count({ where: { userId: session.user.id, archived: false } }),
    prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate current streak from recent activities
  const recentActivities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 365,
  });

  const uniqueDates = Array.from(
    new Set(recentActivities.map((a) => a.createdAt.toLocaleDateString("en-CA")))
  ).sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    const latest = uniqueDates[0];

    if (latest >= yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const current = uniqueDates[i - 1];
        const previous = uniqueDates[i];
        const currentDate = new Date(current + "T12:00:00");
        const expectedPrevious = new Date(currentDate.getTime() - 86400000)
          .toISOString()
          .split("T")[0];
        if (previous === expectedPrevious) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  return {
    name: user?.name || null,
    totalActivities: activityCount,
    totalProjects: projectCount,
    currentStreak,
    goalsCount: goals.length,
    recentGoals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      deadline: g.deadline,
      why: g.why,
      createdAt: g.createdAt,
    })),
  };
}

/**
 * Build comprehensive interview context for a project
 */
export async function buildInterviewContext(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    include: {
      _count: { select: { activities: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20, // More activities for interview context
        select: { content: true, createdAt: true },
      },
    },
  });

  if (!project) return null;

  // Format activities as a timeline for the AI
  const timeline = project.activities
    .map((a) => {
      const dateStr = a.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `- [${dateStr}] ${a.content}`;
    })
    .join("\n");

  return {
    projectName: project.name,
    projectDescription: project.description,
    activityCount: project._count.activities,
    activityTimeline: timeline,
  };
}
