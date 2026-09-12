/**
 * Projects domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getLockedProjectIdsForActor } from '@/lib/project-lock';
import {
  JobmarkActor,
  assertActor,
  NotFoundError,
  ValidationError,
  VaultLockedError,
} from './index';
import { z } from 'zod';
import { getActivityDisplayContent } from './activity-copy';
import { projectColors } from '@/lib/constants';

const projectCreateSchema = z
  .object({
    name: z.string().min(1).max(50),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default(projectColors[0]),
    description: z.string().max(200).optional().nullable(),
  })
  .strict();

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
  options: {
    includeArchived?: boolean;
    includeLocked?: boolean;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<ProjectsListResult> {
  assertActor(actor);

  const { includeArchived = false, cursor } = options;
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
  const lockedIds = await getLockedProjectIdsForActor(actor);

  const where: Prisma.ProjectWhereInput = { userId: actor.userId };
  if (!includeArchived) where.archived = false;
  // Privacy is derived from the verified actor. The legacy includeLocked
  // flag is intentionally ignored so callers cannot bypass the vault policy.
  if (lockedIds.length > 0) where.id = { notIn: lockedIds };

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : undefined,
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (projects.length > limit) {
    projects.pop();
    nextCursor = projects[projects.length - 1]?.id ?? null;
  }

  return { projects: projects.map(toProjectDTO), nextCursor };
}

export async function getProject(actor: JobmarkActor, projectId: string): Promise<ProjectDTO> {
  assertActor(actor);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
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

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const { cursor } = options;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
  });

  if (!project) throw new NotFoundError('Project');
  if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const activities = await prisma.activity.findMany({
    where: { projectId, userId: actor.userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : undefined,
    include: { project: { select: { id: true, name: true, color: true, archived: true } } },
  });

  let nextCursor: string | null = null;
  if (activities.length > limit) {
    activities.pop();
    nextCursor = activities[activities.length - 1]?.id ?? null;
  }

  return {
    project: toProjectDTO(project),
    activities: activities.map(a => ({
      id: a.id,
      content: getActivityDisplayContent(a.content),
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
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
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
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
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
    include: {
      _count: {
        select: {
          activities: { where: { userId: actor.userId } },
          reports: { where: { userId: actor.userId } },
        },
      },
    },
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
