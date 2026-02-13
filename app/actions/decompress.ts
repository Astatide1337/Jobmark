"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function logDecompressionSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  try {
    // 1. Find or Create the "Decompress" project
    let project = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: "Decompress",
      },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: session.user.id,
          name: "Decompress",
          color: "#d4a574", // Warm amber
          description: "Sessions for psychological detachment and rest.",
        },
      });
    }

    // 2. Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        content: "Completed a decompression ritual.",
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to log decompression session:", error);
    return { error: "Failed to log session" };
  }
}
