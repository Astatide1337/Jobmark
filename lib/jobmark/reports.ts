/**
 * Reports domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { filterLockedReports, getLockedProjectIdsForActor } from '@/lib/project-lock';
import {
  JobmarkActor,
  assertActor,
  NotFoundError,
  ValidationError,
  VaultLockedError,
} from './index';
import { z } from 'zod';
import { buildReviewBrief, deterministicRewrite } from '@/lib/deterministic-drafts';
import { getActivityDisplayContent } from './activity-copy';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarRange,
  isValidCalendarDate,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';

const reportImproveSchema = z
  .object({
    reportId: z.string().min(1).max(100),
    instructions: z.string().max(500).optional(),
  })
  .strict();

const reportToneSchema = z.enum(['professional', 'casual', 'bullet-points']);
const reportDateRangeSchema = z.enum(['7d', '30d', 'month', 'custom']);

const reportGenerationOptionsSchema = z
  .object({
    scope: z.enum(['all', 'unassigned']).optional(),
    dateRange: reportDateRangeSchema.default('30d'),
    customStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    customEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    tone: reportToneSchema.default('professional'),
    notes: z.string().max(4_000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dateRange === 'custom') {
      if (!value.customStartDate || !value.customEndDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Custom review dates are required.',
        });
      }
    }
    for (const [field, date] of [
      ['customStartDate', value.customStartDate],
      ['customEndDate', value.customEndDate],
    ] as const) {
      if (date && !isValidCalendarDate(date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Invalid calendar date.',
        });
      }
    }
    if (
      value.customStartDate &&
      value.customEndDate &&
      value.customStartDate > value.customEndDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The start date must be on or before the end date.',
      });
    }
  });

export type ReportImproveInput = z.infer<typeof reportImproveSchema>;
export type ReportGenerationOptions = z.infer<typeof reportGenerationOptionsSchema>;

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
  const lockedIds = await getLockedProjectIdsForActor(actor);

  const visibleReports: ReportWithProject[] = [];
  let databaseCursor = cursor;
  let hasMoreRows = true;
  while (visibleReports.length <= limit && hasMoreRows) {
    const batch = await prisma.report.findMany({
      where: { userId: actor.userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      cursor: databaseCursor ? { id: databaseCursor } : undefined,
      skip: databaseCursor ? 1 : undefined,
      include: { project: { select: { id: true, name: true, color: true } } },
    });
    if (batch.length === 0) break;
    visibleReports.push(...filterLockedReports(batch, lockedIds));
    databaseCursor = batch[batch.length - 1]?.id;
    hasMoreRows = batch.length > limit;
  }

  const hasNextPage = visibleReports.length > limit;
  const reports = visibleReports.slice(0, limit);
  const nextCursor = hasNextPage ? (reports[reports.length - 1]?.id ?? null) : null;
  const visibilityRows = await prisma.report.findMany({
    where: { userId: actor.userId },
    select: { projectId: true, metadata: true },
  });
  const totalCount = filterLockedReports(visibilityRows, lockedIds).length;

  return {
    reports: reports.map(toReportPreviewDTO),
    nextCursor,
    totalCount,
  };
}

export async function getReport(actor: JobmarkActor, reportId: string): Promise<ReportDTO> {
  assertActor(actor);

  const lockedIds = await getLockedProjectIdsForActor(actor);

  const report = await prisma.report.findFirst({
    where: { id: reportId, userId: actor.userId },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
  });

  if (!report || filterLockedReports([report], lockedIds).length === 0) {
    throw new NotFoundError('Review draft');
  }

  return toReportDTO(report);
}

export async function generateReport(
  actor: JobmarkActor,
  projectId: string | null,
  customInstructions?: string,
  options: Partial<ReportGenerationOptions> = {}
): Promise<ReportDTO> {
  assertActor(actor);

  const parsedOptions = reportGenerationOptionsSchema.safeParse({
    ...options,
    notes: options.notes ?? customInstructions ?? null,
  });
  if (!parsedOptions.success) {
    throw new ValidationError('Validation failed', parsedOptions.error.flatten().fieldErrors);
  }
  const generationOptions = parsedOptions.data;
  const scope = projectId ? 'project' : (generationOptions.scope ?? 'all');

  const lockedIds = await getLockedProjectIdsForActor(actor);
  const project = projectId
    ? await prisma.project.findFirst({
        where: { id: projectId, userId: actor.userId },
        select: { id: true, name: true, locked: true },
      })
    : null;

  if (projectId && !project) throw new NotFoundError('Project');
  if (project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const timeZone = await getActorTimeZone(actor.userId);
  const range = getCalendarRange({
    kind: generationOptions.dateRange,
    timeZone,
    customStartDate: generationOptions.customStartDate,
    customEndDate: generationOptions.customEndDate,
  });

  const generated = await buildGeneratedReportContent(
    actor,
    projectId,
    generationOptions.notes ?? undefined,
    lockedIds,
    scope,
    range.startDate,
    range.endDate,
    generationOptions.tone
  );

  const report = await prisma.report.create({
    data: {
      userId: actor.userId,
      projectId: projectId || null,
      title: getGeneratedReportTitle(project?.name, scope),
      content: generated.content,
      metadata: {
        generated: true,
        deterministic: true,
        scope,
        projectId,
        sourceProjectIds: generated.sourceProjectIds,
        rangeStartDate: range.startDate,
        rangeEndDate: range.endDate,
        resolvedStartDate: generated.startDate,
        resolvedEndDate: generated.endDate,
        dateRange: generationOptions.dateRange,
        customStartDate: generationOptions.customStartDate ?? null,
        customEndDate: generationOptions.customEndDate ?? null,
        timeZone: range.timeZone,
        tone: generationOptions.tone,
        notes: generationOptions.notes ?? null,
      },
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

  const lockedIds = await getLockedProjectIdsForActor(actor);
  if (!report || filterLockedReports([report], lockedIds).length === 0) {
    throw new NotFoundError('Review draft');
  }
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const metadata = report.metadata;
  if (!isReportScopeMetadata(metadata)) {
    throw new ValidationError(
      'This saved draft does not have a reusable scope. Generate a new review draft instead.'
    );
  }
  const generated = await buildGeneratedReportContent(
    actor,
    metadata.scope === 'project' ? metadata.projectId : null,
    metadata.notes ?? undefined,
    lockedIds,
    metadata.scope,
    metadata.rangeStartDate,
    metadata.rangeEndDate,
    metadata.tone
  );
  const updated = await prisma.report.update({
    where: { id: report.id },
    data: {
      content: generated.content,
      metadata: {
        ...metadata,
        sourceProjectIds: generated.sourceProjectIds,
        resolvedStartDate: generated.startDate,
        resolvedEndDate: generated.endDate,
      },
    },
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

  const lockedIds = await getLockedProjectIdsForActor(actor);
  if (!report || filterLockedReports([report], lockedIds).length === 0) {
    throw new NotFoundError('Review draft');
  }
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  return {
    improvedContent: deterministicRewrite(
      report.content,
      result.data.instructions ?? 'Make this easier to read.'
    ),
  };
}

export async function deleteReport(actor: JobmarkActor, reportId: string): Promise<void> {
  assertActor(actor);

  const report = await prisma.report.findFirst({
    where: { id: reportId, userId: actor.userId },
    include: { project: { select: { locked: true } } },
  });

  const lockedIds = await getLockedProjectIdsForActor(actor);
  if (!report || filterLockedReports([report], lockedIds).length === 0) {
    throw new NotFoundError('Review draft');
  }
  if (report.project?.locked && !actor.vaultUnlocked) throw new VaultLockedError();

  await prisma.report.delete({ where: { id: reportId } });
}

type ReportWithProject = Prisma.ReportGetPayload<{
  include: { project: { select: { id: true; name: true; color: true } } };
}>;

type ReportScopeMetadata = {
  generated: true;
  deterministic: true;
  scope: 'all' | 'project' | 'unassigned';
  projectId: string | null;
  sourceProjectIds: string[];
  rangeStartDate: string;
  rangeEndDate: string;
  resolvedStartDate: string;
  resolvedEndDate: string;
  dateRange: '7d' | '30d' | 'month' | 'custom';
  customStartDate: string | null;
  customEndDate: string | null;
  timeZone: string;
  tone: 'professional' | 'casual' | 'bullet-points';
  notes: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getGeneratedReportTitle(
  projectName: string | undefined,
  scope: 'all' | 'project' | 'unassigned'
): string {
  if (projectName) return `Review draft: ${projectName}`;
  if (scope === 'unassigned') return 'Review draft: No project';
  return 'Review draft';
}

function isBoundedRecordId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 100;
}

function hasValidReportScope(value: Record<string, unknown>): boolean {
  if (value.scope === 'project') return isBoundedRecordId(value.projectId);
  return (value.scope === 'all' || value.scope === 'unassigned') && value.projectId === null;
}

function hasValidReportSourceProjects(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.sourceProjectIds) &&
    value.sourceProjectIds.length <= 500 &&
    value.sourceProjectIds.every(id => isBoundedRecordId(id))
  );
}

function hasValidReportDateMetadata(value: Record<string, unknown>): boolean {
  const rangeStartDate = value.rangeStartDate;
  const rangeEndDate = value.rangeEndDate;
  const resolvedStartDate = value.resolvedStartDate;
  const resolvedEndDate = value.resolvedEndDate;
  if (
    typeof rangeStartDate !== 'string' ||
    typeof rangeEndDate !== 'string' ||
    typeof resolvedStartDate !== 'string' ||
    typeof resolvedEndDate !== 'string'
  ) {
    return false;
  }
  return (
    isValidCalendarDate(rangeStartDate) &&
    isValidCalendarDate(rangeEndDate) &&
    rangeStartDate <= rangeEndDate &&
    isValidCalendarDate(resolvedStartDate) &&
    isValidCalendarDate(resolvedEndDate) &&
    resolvedStartDate <= resolvedEndDate
  );
}

function hasValidCustomReportDates(value: Record<string, unknown>): boolean {
  if (value.dateRange === 'custom') {
    const start = value.customStartDate;
    const end = value.customEndDate;
    return (
      typeof start === 'string' &&
      typeof end === 'string' &&
      isValidCalendarDate(start) &&
      isValidCalendarDate(end) &&
      start <= end
    );
  }
  return (
    (value.dateRange === '7d' || value.dateRange === '30d' || value.dateRange === 'month') &&
    value.customStartDate === null &&
    value.customEndDate === null
  );
}

function isReportScopeMetadata(value: unknown): value is ReportScopeMetadata {
  if (!isRecord(value)) return false;
  return (
    value.generated === true &&
    value.deterministic === true &&
    hasValidReportScope(value) &&
    hasValidReportSourceProjects(value) &&
    hasValidReportDateMetadata(value) &&
    (value.dateRange === '7d' ||
      value.dateRange === '30d' ||
      value.dateRange === 'month' ||
      value.dateRange === 'custom') &&
    hasValidCustomReportDates(value) &&
    typeof value.timeZone === 'string' &&
    isValidTimeZone(value.timeZone) &&
    (value.tone === 'professional' || value.tone === 'casual' || value.tone === 'bullet-points') &&
    (value.notes === null || (typeof value.notes === 'string' && value.notes.length <= 4_000))
  );
}

async function buildGeneratedReportContent(
  actor: JobmarkActor,
  projectId: string | null,
  customInstructions: string | undefined,
  lockedIds: string[],
  scope: 'all' | 'project' | 'unassigned' = projectId ? 'project' : 'all',
  startDate?: string,
  endDate?: string,
  tone: 'professional' | 'casual' | 'bullet-points' = 'professional'
): Promise<{
  content: string;
  sourceProjectIds: string[];
  startDate: string;
  endDate: string;
}> {
  let selectedProjectId: string | null | undefined;
  if (scope === 'project') selectedProjectId = projectId;
  else if (scope === 'unassigned') selectedProjectId = null;

  const activities = await prisma.activity.findMany({
    where: {
      userId: actor.userId,
      projectId: selectedProjectId,
      ...(scope === 'all' && lockedIds.length > 0
        ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
        : {}),
      ...(startDate || endDate
        ? {
            logDate: {
              ...(startDate ? { gte: calendarDateToUtcMidnight(startDate) } : {}),
              ...(endDate ? { lt: calendarDateToUtcMidnight(shiftCalendarDate(endDate, 1)) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ logDate: 'asc' }, { id: 'asc' }],
    take: 501,
    include: { project: { select: { name: true } } },
  });

  if (activities.length === 0) throw new ValidationError('No notes found for this review.');
  if (activities.length > 500) {
    throw new ValidationError(
      'There are too many notes. Choose one project or a shorter date range.'
    );
  }

  const resolvedStartDate = activities[0].logDate.toISOString().slice(0, 10);
  const resolvedEndDate = activities[activities.length - 1].logDate.toISOString().slice(0, 10);
  const sourceProjectIds = [
    ...new Set(
      activities
        .map(activity => activity.projectId)
        .filter((projectId): projectId is string => Boolean(projectId))
    ),
  ];

  return {
    content: buildReviewBrief({
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      tone,
      notes: customInstructions,
      activities: activities.map(activity => ({
        logDate: activity.logDate,
        content: getActivityDisplayContent(activity.content),
        projectName: activity.project?.name ?? null,
      })),
    }),
    sourceProjectIds,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
  };
}

async function getActorTimeZone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  return settings?.timeZone && isValidTimeZone(settings.timeZone)
    ? settings.timeZone
    : DEFAULT_TIME_ZONE;
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
