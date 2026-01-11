"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectColors } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  description: z.string().max(200).optional(),
});

export type ProjectFormState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    color?: string[];
    description?: string[];
  };
};

export async function createProject(
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in" };
  }

  const rawData = {
    name: formData.get("name") as string,
    color: formData.get("color") as string || projectColors[0],
    description: formData.get("description") as string || undefined,
  };

  const result = projectSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.project.create({
      data: {
        userId: session.user.id,
        name: result.data.name,
        color: result.data.color,
        description: result.data.description,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    
    return { success: true, message: "Project created" };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, message: "Failed to create project" };
  }
}

export async function getProjects(filter: "active" | "archived" = "active") {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where: { 
      userId: session.user.id,
      archived: filter === "archived",
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { activities: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });

  return projects;
}

export async function updateProject(
  projectId: string,
  data: { name?: string; color?: string; description?: string }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.project.update({
      where: { 
        id: projectId,
        userId: session.user.id,
      },
      data,
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { success: true, message: "Project updated" };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { success: false, message: "Failed to update project" };
  }
}

export async function archiveProject(projectId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.project.update({
      where: { 
        id: projectId,
        userId: session.user.id,
      },
      data: { archived: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { success: true, message: "Project archived" };
  } catch (error) {
    console.error("Failed to archive project:", error);
    return { success: false, message: "Failed to archive project" };
  }
}

export async function unarchiveProject(projectId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await prisma.project.update({
      where: { 
        id: projectId,
        userId: session.user.id,
      },
      data: { archived: false },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { success: true, message: "Project restored" };
  } catch (error) {
    console.error("Failed to restore project:", error);
    return { success: false, message: "Failed to restore project" };
  }
}

export async function getProjectDetails(projectId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { 
      id: projectId,
      userId: session.user.id,
    },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { activities: true },
      },
    },
  });

  return project;
}
