/**
 * Reports domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { getLockedProjectIds } from '@/lib/project-lock';
import { JobmarkActor, assertActor, NotFoundError, ValidationError, VaultLockedError } from './index';
import { z } from 'zod';

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
  metadata: any | null;
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

  const { limit = 25, cursor } = options;
  const lockedIds = await getLockedProjectIds(actor.userId);

  const where: any = {
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
  const lockedFilter = lockedIds.length > 0
    ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
    : {};

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

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: actor.userId },
      select: { locked: true },
    });
    if (!project) throw new NotFoundError('Project');
    if (project.locked && !actor.vaultUnlocked) throw new VaultLockedError();
  }

  // Generate report using AI - this would call the existing AI generation logic
  // For now, return a placeholder
  const report = await prisma.report.create({
    data: {
      userId: actor.userId,
      projectId: projectId || null,
      title: projectId ? `Project Report: ${projectId}` : 'Activity Report',
      content: 'Generated report content...',
      metadata: { generated: true },
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return toReportDTO(report);
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

  // Call AI to improve text - placeholder
  return { improvedContent: 'Improved content...' };
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

function toReportDTO(report: any): ReportDTO {
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

function toReportPreviewDTO(report: any): ReportPreviewDTO {
  return {
    id: report.id,
    projectId: report.projectId,
    project: report.project,
    title: report.title,
    contentPreview: report.content.slice(0, 200),
    createdAt: report.createdAt.toISOString(),
  };
}