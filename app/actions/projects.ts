/**
 * Project Management Actions
 *
 * Why: Projects allow users to group their activities into logical workstreams.
 * This module handles the CRUD lifecycle and project archiving.
 *
 * Performance Note:
 * `getProjects` includes an activity count and the timestamp of the last
 * activity. This allows the UI to show "Last activity: X days ago" without
 * fetching the entire activity history for every project.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { projectColors } from '@/lib/constants';
import { getLockedProjectIds } from '@/lib/project-lock';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { projectUpdateSchema } from '@/lib/input-schemas';
import { getActivityDisplayContent } from '@/lib/jobmark/activity-copy';

const projectSchema = z.object({
  name: z.string().min(1, 'Enter a project name.').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Choose a valid color.'),
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
    return { success: false, message: 'Sign in to create a project.' };
  }

  const rawData = {
    name: formData.get('name') as string,
    color: (formData.get('color') as string) || projectColors[0],
    description: (formData.get('description') as string) || undefined,
  };

  const result = projectSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: 'Check the project and try again.',
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

    revalidatePath('/dashboard');
    revalidatePath('/projects');

    return { success: true, message: 'Project created.' };
  } catch (error) {
    console.error('Failed to create project:', error);
    return { success: false, message: 'The project was not created. Try again.' };
  }
}

export async function getProjects(filter: 'active' | 'archived' = 'active') {
  const targetUserId = await requireUserId();
  const lockedIds = await getLockedProjectIds(targetUserId);

  const projects = await prisma.project.findMany({
    where: {
      userId: targetUserId,
      archived: filter === 'archived',
      ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { activities: true },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
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
    return { success: false, message: 'Sign in to edit this project.' };
  }

  const parsed = projectUpdateSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Check the project and try again.' };

  try {
    await prisma.project.update({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      data: parsed.data,
    });

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { success: true, message: 'Project updated.' };
  } catch (error) {
    console.error('Failed to update project:', error);
    return { success: false, message: 'The project was not updated. Try again.' };
  }
}

export async function archiveProject(projectId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to archive this project.' };
  }

  try {
    await prisma.project.update({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      data: { archived: true },
    });

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { success: true, message: 'Project archived.' };
  } catch (error) {
    console.error('Failed to archive project:', error);
    return { success: false, message: 'The project was not archived. Try again.' };
  }
}

export async function unarchiveProject(projectId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to restore this project.' };
  }

  try {
    await prisma.project.update({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      data: { archived: false },
    });

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { success: true, message: 'Project restored.' };
  } catch (error) {
    console.error('Failed to restore project:', error);
    return { success: false, message: 'The project was not restored. Try again.' };
  }
}

export async function getProjectDetails(projectId: string, activityLimit = 20) {
  const targetUserId = await requireUserId();

  const [project, lockedIds] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId, userId: targetUserId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: activityLimit },
        _count: { select: { activities: true } },
      },
    }),
    getLockedProjectIds(targetUserId),
  ]);

  if (!project) return null;
  if (project.locked && lockedIds.includes(project.id)) return null;

  // Convert logDate to ISO date string (YYYY-MM-DD) to prevent timezone issues
  return {
    ...project,
    activities: project.activities.map(activity => ({
      ...activity,
      content: getActivityDisplayContent(activity.content),
      logDate: activity.logDate.toISOString().split('T')[0],
    })),
  };
}

export async function getProjectActivities(
  projectId: string,
  limit: number = 20,
  offset: number = 0
) {
  const targetUserId = await requireUserId();

  const [project, lockedIds] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId, userId: targetUserId },
      select: { id: true, locked: true },
    }),
    getLockedProjectIds(targetUserId),
  ]);

  if (!project) return [];
  if (project.locked && lockedIds.includes(project.id)) return [];

  const activities = await prisma.activity.findMany({
    where: { projectId, userId: targetUserId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Convert logDate to ISO date string (YYYY-MM-DD) to prevent timezone issues
  return activities.map(activity => ({
    ...activity,
    content: getActivityDisplayContent(activity.content),
    logDate: activity.logDate.toISOString().split('T')[0],
  }));
}
