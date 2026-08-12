/**
 * Reports domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getLockedProjectIds } from '@/lib/project-lock';
import {
  JobmarkActor,
  assertActor,
  NotFoundError,
  ValidationError,
  VaultLockedError,
} from './index';
import { z } from 'zod';
import { buildReviewBrief, deterministicRewrite } from '@/lib/deterministic-drafts';

const reportCreateSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  content: z.string(),
});

const reportUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

const reportImproveSchema = z.object({
  reportId: z.string(),
  instructions: z.string().optional(),
});

export type ReportInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type ReportImproveInput = z.infer<typeof reportImproveSchema>;

export type ReportDTO = {
  id: string;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  title: string;
  content: string;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
};

export type ReportPreviewDTO = {
  id: string;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  title: string;
  contentPreview: string;
  createdAt: string;
};

export type ReportsListResult = {
  reports: ReportPreviewDTO[];
  nextCursor: string | null;
  totalCount: number;
};

export async function listReports(
  actor: JobmarkActor,
  options: { limit?: number; cursor?: string } = {}
): Promise<ReportsListResult> {
  assertActor(actor);

  const { cursor } = options;
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const lockedIds = await getLockedProjectIds(actor.userId);

  const where: Prisma.ReportWhereInput = {
    userId: actor.userId,
    ...(lockedIds.length > 0 && {
      OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
    }),
  };

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : undefined,
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
  });

  let nextCursor: string | null = null;
  if (reports.length > limit) {
    const next = reports.pop();
    nextCursor = next!.id;
  }

  const totalCount = await prisma.report.count({ where });

  return {
    reports: reports.map(toReportPreviewDTO),
    nextCursor,
    totalCount,
  };
}

export async function getReport(actor: JobmarkActor, reportId: string): Promise<ReportDTO> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIds(actor.userId);

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId: actor.userId,
      ...(lockedIds.length > 0 && {
        OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
      }),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
  });

  if (!report) throw new NotFoundError('Report');

  return toReportDTO(report);
}

export async function checkActivityCount(actor: JobmarkActor): Promise<{
  eligible: boolean;
  count: number;
  minimum: number;
}> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIds(actor.userId);
  const lockedFilter =
    lockedIds.length > 0 ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] } : {};

  const count = await prisma.activity.count({
    where: { userId: actor.userId, ...lockedFilter },
  });

  return { eligible: count >= 3, count, minimum: 3 };
}

export async function generateReport(
  actor: JobmarkActor,
  projectId: string | null,
  customInstructions?: string
): Promise<ReportDTO> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIds(actor.userId);
  const project = projectId
    ? await prisma.project.findFirst({
        where: { id: projectId, userId: actor.userId },
        select: { id: true, name: true, locked: true },
      })
    : null;

  if (projectId && !project) throw new NotFoundError('Project');
  if (project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const content = await buildGeneratedReportContent(
    actor,
    projectId,
    customInstructions,
    lockedIds
  );

  const report = await prisma.report.create({
    data: {
      userId: actor.userId,
      projectId: projectId || null,
      title: project ? `Review brief: ${project.name}` : 'Review brief',
      content,
      metadata: { generated: true, deterministic: true },
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return toReportDTO(report);
}

/** Rebuild an existing deterministic brief in place from its saved scope. */
export async function regenerateReport(actor: JobmarkActor, reportId: string): Promise<ReportDTO> {
  assertActor(actor);

  const report = await prisma.report.findFirst({
    where: { id: reportId, userId: actor.userId },
    include: { project: { select: { id: true, name: true, color: true, locked: true } } },
  });

  if (!report) throw new NotFoundError('Report');
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const lockedIds = await getLockedProjectIds(actor.userId);
  const content = await buildGeneratedReportContent(actor, report.projectId, undefined, lockedIds);
  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { content, metadata: { generated: true, deterministic: true } },
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return toReportDTO(updated);
}

export async function createReport(actor: JobmarkActor, input: ReportInput): Promise<ReportDTO> {
  assertActor(actor);

  const result = reportCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  if (result.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: result.data.projectId, userId: actor.userId },
      select: { locked: true },
    });
    if (!project) throw new NotFoundError('Project');
    if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();
  }

  const report = await prisma.report.create({
    data: {
      userId: actor.userId,
      projectId: result.data.projectId || null,
      title: result.data.title,
      content: result.data.content,
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return toReportDTO(report);
}

export async function updateReport(
  actor: JobmarkActor,
  reportId: string,
  input: ReportUpdateInput
): Promise<ReportDTO> {
  assertActor(actor);

  const result = reportUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const report = await prisma.report.findFirst({
    where: { id: reportId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  if (!report) throw new NotFoundError('Report');
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: result.data,
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return toReportDTO(updated);
}

export async function improveReportText(
  actor: JobmarkActor,
  input: ReportImproveInput
): Promise<{ improvedContent: string }> {
  assertActor(actor);

  const result = reportImproveSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const report = await prisma.report.findFirst({
    where: { id: result.data.reportId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  if (!report) throw new NotFoundError('Report');
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  return {
    improvedContent: deterministicRewrite(
      report.content,
      result.data.instructions ?? 'Make this easier to scan.'
    ),
  };
}

export async function deleteReport(actor: JobmarkActor, reportId: string): Promise<void> {
  assertActor(actor);

  const report = await prisma.report.findFirst({
    where: { id: reportId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  if (!report) throw new NotFoundError('Report');
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  await prisma.report.delete({ where: { id: reportId } });
}

type ReportWithProject = Prisma.ReportGetPayload<{
  include: { project: { select: { id: true; name: true; color: true } } };
}>;

async function buildGeneratedReportContent(
  actor: JobmarkActor,
  projectId: string | null,
  customInstructions: string | undefined,
  lockedIds: string[]
): Promise<string> {
  const activities = await prisma.activity.findMany({
    where: {
      userId: actor.userId,
      projectId: projectId ?? undefined,
      ...(projectId === null && lockedIds.length > 0
        ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
        : {}),
    },
    orderBy: { logDate: 'asc' },
    take: 501,
    include: { project: { select: { name: true } } },
  });

  if (activities.length === 0) throw new ValidationError('No activities found for this report');
  if (activities.length > 500) {
    throw new ValidationError('Too many activities; narrow the project scope before generating');
  }

  return buildReviewBrief({
    startDate: activities[0].logDate.toISOString().slice(0, 10),
    endDate: activities[activities.length - 1].logDate.toISOString().slice(0, 10),
    tone: 'professional',
    notes: customInstructions,
    activities: activities.map(activity => ({
      logDate: activity.logDate,
      content: activity.content,
      projectName: activity.project?.name ?? null,
    })),
  });
}

function toReportDTO(report: ReportWithProject): ReportDTO {
  return {
    id: report.id,
    projectId: report.projectId,
    project: report.project,
    title: report.title,
    content: report.content,
    metadata: report.metadata,
    createdAt: report.createdAt.toISOString(),
  };
}

function toReportPreviewDTO(report: ReportWithProject): ReportPreviewDTO {
  return {
    id: report.id,
    projectId: report.projectId,
    project: report.project,
    title: report.title,
    contentPreview: report.content.slice(0, 200),
    createdAt: report.createdAt.toISOString(),
  };
}
