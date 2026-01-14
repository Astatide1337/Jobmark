"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type GoalData = {
  id: string;
  title: string;
  deadline: string | null;
  why: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getGoals(): Promise<GoalData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return goals.map(goal => ({
    ...goal,
    deadline: goal.deadline?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }));
}

export async function createGoal(data: {
  title: string;
  deadline?: Date | null;
  why?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        title: data.title,
        deadline: data.deadline,
        why: data.why,
      },
    });

    const goalData: GoalData = {
      ...goal,
      deadline: goal.deadline?.toISOString() ?? null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true, goal: goalData };
  } catch (error) {
    console.error("Failed to create goal:", error);
    return { success: false, message: "Failed to create goal" };
  }
}

export async function updateGoal(
  id: string,
  data: {
    title?: string;
    deadline?: Date | null;
    why?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    const existing = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: "Goal not found" };
    }

    const goal = await prisma.goal.update({
      where: { id },
      data,
    });

    const goalData: GoalData = {
      ...goal,
      deadline: goal.deadline?.toISOString() ?? null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true, goal: goalData };
  } catch (error) {
    console.error("Failed to update goal:", error);
    return { success: false, message: "Failed to update goal" };
  }
}

export async function deleteGoal(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    // Verify ownership
    const existing = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: "Goal not found" };
    }

    await prisma.goal.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true, message: "Goal deleted" };
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return { success: false, message: "Failed to delete goal" };
  }
}
