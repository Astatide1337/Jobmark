/**
 * Projects domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getLockedProjectIds } from '@/lib/project-lock';
import { JobmarkActor, assertActor, NotFoundError, ValidationError, VaultLockedError } from './index';
import { z } from 'zod';

const projectCreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  description: z.string().max(200).optional().nullable(),
});

const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export type ProjectDTO = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  archived: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { activities: number; reports: number };
};

export type ProjectsListResult = {
  projects: ProjectDTO[];
  nextCursor: string | null;
};

export async function listProjects(
  actor: JobmarkActor,
  options: { includeArchived?: boolean; includeLocked?: boolean; limit?: number; cursor?: string } = {}
): Promise<ProjectsListResult> {
  assertActor(actor);

  const { includeArchived = false, includeLocked = false, limit = 100, cursor } = options;
  const lockedIds = await getLockedProjectIds(actor.userId);

  const where: Prisma.ProjectWhereInput = { userId: actor.userId };
  if (!includeArchived) where.archived = false;
  if (!includeLocked && lockedIds.length > 0) where.id = { notIn: lockedIds };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: { _count: { select: { activities: true, reports: true } } },
  });

  let nextCursor: string | null = null;
  if (projects.length > limit) {
    const next = projects.pop();
    nextCursor = next!.id;
  }

  return { projects: projects.map(toProjectDTO), nextCursor };
}

export async function getProject(actor: JobmarkActor, projectId: string): Promise<ProjectDTO> {
  assertActor(actor);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
    include: { _count: { select: { activities: true, reports: true } } },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  return toProjectDTO(project);
}

export async function getProjectWithActivities(
  actor: JobmarkActor,
  projectId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{
  project: ProjectDTO;
  activities: Array<{
    id: string;
    content: string;
    logDate: string;
    createdAt: string;
    project: { id: string; name: string; color: string; archived: boolean } | null;
  }>;
  nextCursor: string | null;
}> {
  assertActor(actor);

  const { limit = 50, cursor } = options;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
    include: { _count: { select: { activities: true, reports: true } } },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const activities = await prisma.activity.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: { project: { select: { id: true, name: true, color: true, archived: true } } },
  });

  let nextCursor: string | null = null;
  if (activities.length > limit) {
    const next = activities.pop();
    nextCursor = next!.id;
  }

  return {
    project: toProjectDTO(project),
    activities: activities.map((a) => ({
      id: a.id,
      content: a.content,
      logDate: a.logDate.toISOString().split('T')[0],
      createdAt: a.createdAt.toISOString(),
      project: a.project,
    })),
    nextCursor,
  };
}

export async function createProject(actor: JobmarkActor, input: ProjectInput): Promise<ProjectDTO> {
  assertActor(actor);

  const result = projectCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const project = await prisma.project.create({
    data: {
      userId: actor.userId,
      name: result.data.name,
      color: result.data.color,
      description: result.data.description,
    },
    include: { _count: { select: { activities: true, reports: true } } },
  });

  return toProjectDTO(project);
}

export async function updateProject(
  actor: JobmarkActor,
  projectId: string,
  input: ProjectUpdateInput
): Promise<ProjectDTO> {
  assertActor(actor);

  const result = projectUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: result.data,
    include: { _count: { select: { activities: true, reports: true } } },
  });

  return toProjectDTO(updated);
}

export async function setProjectArchived(
  actor: JobmarkActor,
  projectId: string,
  archived: boolean
): Promise<ProjectDTO> {
  assertActor(actor);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { archived },
    include: { _count: { select: { activities: true, reports: true } } },
  });

  return toProjectDTO(updated);
}

export async function deleteProject(actor: JobmarkActor, projectId: string): Promise<void> {
  assertActor(actor);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  await prisma.project.delete({ where: { id: projectId } });
}

type ProjectWithCounts = Prisma.ProjectGetPayload<{
  include: { _count: { select: { activities: true; reports: true } } };
}>;

function toProjectDTO(project: ProjectWithCounts): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    description: project.description,
    archived: project.archived,
    locked: project.locked,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    _count: project._count,
  };
}
