/**
 * Report Generation & Management Actions
 *
 * Why: The core value of jobmark is transforming raw activity logs into
 * professional summaries for performance reviews. These actions build
 * evidence-based briefs and manage report history without routing content
 * through a separate model service.
 *
 * Implementation:
 * - `streamReport`: Returns a deterministic brief built from the user's
 *   activity record. The name remains for compatibility with the review UI.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, filterLockedReports } from '@/lib/project-lock';
import { DEFAULT_TIME_ZONE, getCalendarRange, isValidTimeZone } from '@/lib/date-semantics';
import { z } from 'zod';
import { buildReviewBrief } from '@/lib/deterministic-drafts';
import { getActivityDisplayContent } from '@/lib/jobmark/activity-copy';

export type ReportConfig = {
  dateRange: '7d' | '30d' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  projectId?: string | null; // null means unassigned
  tone: 'professional' | 'casual' | 'bullet-points';
  notes?: string;
};

const reportConfigSchema = z.object({
  dateRange: z.enum(['7d', '30d', 'month', 'custom']),
  customStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  customEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  projectId: z.string().max(100).nullable().optional(),
  tone: z.enum(['professional', 'casual', 'bullet-points']),
  notes: z.string().max(4_000).optional(),
});

function validateReportConfig(config: ReportConfig): ReportConfig {
  const parsed = reportConfigSchema.safeParse(config);
  if (!parsed.success) throw new Error('Check the review settings and try again.');
  return parsed.data;
}

async function getReportRange(userId: string, config: ReportConfig) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  return getCalendarRange({
    kind: config.dateRange,
    timeZone,
    customStartDate: config.customStartDate,
    customEndDate: config.customEndDate,
  });
}

async function getOwnedProject(userId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, locked: true },
  });
}

// Streaming report generation
export async function streamReport(config: ReportConfig) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Sign in to make a review draft.');
  }
  config = validateReportConfig(config);

  // Activity reports use the date the work represents, not row creation time.
  const range = await getReportRange(session.user.id, config);

  // 2. Guard locked projects
  const lockedIds = await getLockedProjectIds(session.user.id);

  if (config.projectId) {
    const project = await getOwnedProject(session.user.id, config.projectId);
    if (!project) throw new Error('That project is no longer available.');
  }

  // If specific project is locked and vault is closed, block
  if (config.projectId && lockedIds.includes(config.projectId)) {
    throw new Error('Open private projects before using this project.');
  }

  // 2b. Fetch activities
  const activities = await prisma.activity.findMany({
    where: {
      userId: session.user.id,
      logDate: { gte: range.start, lt: range.endExclusive },
      // Handle "Unassigned" (null) vs specific project vs All (undefined in typical filter logic, but here we expect explicit selection)
      projectId: config.projectId === undefined ? undefined : config.projectId,
      // Exclude locked project activities when generating "all projects" report
      ...(config.projectId === undefined &&
        lockedIds.length > 0 && {
          OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
        }),
    },
    orderBy: { logDate: 'asc' },
    take: 501,
    include: {
      project: true,
    },
  });

  if (activities.length > 500) {
    throw new Error('There are too many notes. Choose a shorter date range or one project.');
  }
  if (activities.length === 0) {
    throw new Error('No notes for this period.');
  }

  const content = buildReviewBrief({
    startDate: range.startDate,
    endDate: range.endDate,
    tone: config.tone,
    notes: config.notes,
    activities: activities.map(activity => ({
      logDate: activity.logDate,
      content: getActivityDisplayContent(activity.content),
      projectName: activity.project?.name ?? null,
    })),
  });

  // The draft is deterministic and complete; returning the text directly
  // avoids a fake streaming layer and keeps this path provider-independent.
  return { output: content };
}

// Check if activities exist for the given config
export async function checkActivityCount(config: ReportConfig) {
  const session = await auth();
  if (!session?.user?.id) return { count: 0 };
  config = validateReportConfig(config);

  const range = await getReportRange(session.user.id, config);

  const lockedIds = await getLockedProjectIds(session.user.id);

  if (config.projectId) {
    const project = await getOwnedProject(session.user.id, config.projectId);
    if (!project) throw new Error('That project is no longer available.');
  }

  // If specific project is locked, return 0
  if (config.projectId && lockedIds.includes(config.projectId)) {
    return { count: 0 };
  }

  const count = await prisma.activity.count({
    where: {
      userId: session.user.id,
      logDate: { gte: range.start, lt: range.endExclusive },
      projectId: config.projectId === undefined ? undefined : config.projectId,
      ...(config.projectId === undefined &&
        lockedIds.length > 0 && {
          OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }],
        }),
    },
  });

  return { count };
}

// Save to History
export async function saveReportToHistory(content: string, config: ReportConfig) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sign in to save this review draft.');
  if (!content.trim() || content.length > 100_000) {
    throw new Error('This review draft is empty or too long.');
  }
  config = validateReportConfig(config);

  if (config.projectId && !(await getOwnedProject(session.user.id, config.projectId))) {
    throw new Error('That project is no longer available.');
  }

  // Generate a friendly title
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `Review draft - ${dateStr}`;

  await prisma.report.create({
    data: {
      userId: session.user.id,
      projectId: config.projectId ?? null,
      title,
      content,
      metadata: {
        dateRange: config.dateRange,
        customStartDate: config.customStartDate ?? null,
        customEndDate: config.customEndDate ?? null,
        projectId: config.projectId ?? null,
        tone: config.tone,
        notes: config.notes ?? null,
      },
    },
  });

  return { success: true };
}

// Get saved reports
export async function getReports() {
  const targetUserId = await requireUserId();

  const lockedIds = await getLockedProjectIds(targetUserId);

  const reports = await prisma.report.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'desc' },
  });

  return filterLockedReports(reports, lockedIds);
}

// Delete a report
export async function deleteReport(reportId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sign in to delete this review draft.');

  await prisma.report.delete({
    where: {
      id: reportId,
      userId: session.user.id, // Security: ensure user owns report
    },
  });

  return { success: true };
}

// Update a saved report
export async function updateReport(reportId: string, content: string, title?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sign in to edit this review draft.');

  const updateData: { content: string; title?: string } = {
    content,
  };

  if (title) {
    updateData.title = title;
  }

  await prisma.report.update({
    where: {
      id: reportId,
      userId: session.user.id, // Security: ensure user owns report
    },
    data: updateData,
  });

  return { success: true };
}
