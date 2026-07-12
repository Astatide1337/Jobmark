/**
 * Report Generation & Management Actions
 *
 * Why: The core value of jobmark is transforming raw activity logs into
 * professional summaries for performance reviews. These actions handle
 * streaming AI generation and historical report management.
 *
 * Technical Implementation:
 * - `streamReport`: Uses the Vercel AI SDK (`createStreamableValue`) to pipe
 *   LLM chunks to the client. It automatically builds a formatted activity
 *   log from the database to serve as the prompt context.
 * - `improveText`: A "Copilot" style action that rewrites specific selections
 *   within the Live Editor.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, filterLockedReports } from '@/lib/project-lock';
import { createStreamableValue } from '@ai-sdk/rsc';
import { createAIClient } from '@/lib/ai';
import { getUserAiConfig } from '@/app/actions/settings';
import { DEFAULT_TIME_ZONE, getCalendarRange, isValidTimeZone } from '@/lib/date-semantics';
import { z } from 'zod';
import { assertAiRequestAllowed } from '@/lib/ai-rate-limit';

export type ReportConfig = {
  dateRange: '7d' | '30d' | 'month' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  projectId?: string | null; // null means unassigned
  tone: 'professional' | 'casual' | 'bullet-points';
  notes?: string;
};

const reportConfigSchema = z.object({
  dateRange: z.enum(['7d', '30d', 'month', 'custom']),
  customStartDate: z.date().optional(),
  customEndDate: z.date().optional(),
  projectId: z.string().max(100).nullable().optional(),
  tone: z.enum(['professional', 'casual', 'bullet-points']),
  notes: z.string().max(4_000).optional(),
});

function validateReportConfig(config: ReportConfig): ReportConfig {
  const parsed = reportConfigSchema.safeParse(config);
  if (!parsed.success) throw new Error('Invalid report configuration');
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
    throw new Error('Unauthorized');
  }
  assertAiRequestAllowed(session.user.id, 'report');
  config = validateReportConfig(config);

  // Activity reports use the date the work represents, not row creation time.
  const range = await getReportRange(session.user.id, config);

  // 2. Guard locked projects
  const lockedIds = await getLockedProjectIds(session.user.id);

  if (config.projectId) {
    const project = await getOwnedProject(session.user.id, config.projectId);
    if (!project) throw new Error('Invalid report project');
  }

  // If specific project is locked and vault is closed, block
  if (config.projectId && lockedIds.includes(config.projectId)) {
    throw new Error('This project is locked.');
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
    throw new Error(
      'This report period contains too many activities. Narrow the date range or project filter.'
    );
  }
  if (activities.length === 0) {
    throw new Error('No activities found for this period.');
  }

  // 3. Format log
  const activityLog = activities
    .map(a => {
      const dateStr = a.logDate.toISOString().slice(0, 10);
      return `- [${dateStr}] ${a.project ? `[${a.project.name}] ` : '[Unassigned] '}${a.content.slice(0, 500)}`;
    })
    .join('\n');
  if (activityLog.length > 40_000) {
    throw new Error(
      'This report period contains too much text. Narrow the date range or project filter.'
    );
  }

  // 4. Construct Prompt
  let systemPrompt =
    "You are an expert professional writer. Summarize the activity log into a report. Write in **active voice** (e.g., 'Implemented feature' instead of 'The feature was implemented'). **Do not** use meta-phrases like 'The activity log records...' or 'This report summarizes...'. Jump straight into the work.";

  if (config.tone === 'professional') {
    systemPrompt +=
      " Use a structured, executive format. Start with a brief 'Executive Summary' paragraph followed by 'Key Accomplishments' grouped by project. Use full sentences for the summary and detailed, value-focused points for the accomplishments.";
  } else if (config.tone === 'casual') {
    systemPrompt +=
      " Use a friendly, conversational email style. Start with a greeting (e.g., 'Hi Team,'). Write as if updating a colleague over coffee.";
  } else if (config.tone === 'bullet-points') {
    systemPrompt +=
      ' strict brevity. Use ONLY bullet points. No introductory text, no summary paragraphs. Just a clean list of done items.';
  }

  const prompt = `
  Activity Log (${range.startDate} - ${range.endDate}):
  ${activityLog}

  User Notes: ${config.notes || 'None'}

  Instructions:
  Generate a report based on the log. Group by project/theme.
  - **No Intro Fluff**: Do not say "Here is the report" or "The log covers...".
  - **Structure**: Group related tasks together logically.
  - **User Overrides**: PRIORITIZE any instructions provided in "User Notes" above.
  `;

  // 5. Stream
  // Config must be resolved before ReadableStream construction so `ai` and `model`
  // are captured in the stream closure with the correct values.
  const { provider, model, apiKey } = await getUserAiConfig();
  const ai = createAIClient(provider, apiKey);
  const stream = createStreamableValue('');

  (async () => {
    try {
      const completion = await ai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: true,
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          stream.update(content);
        }
      }
    } catch (err) {
      console.error('AI Stream Error:', err);
      stream.error(new Error('AI report generation failed. Please try again.'));
    } finally {
      stream.done();
    }
  })();

  return { output: stream.value };
}

// Copilot: Improve selected text
export async function improveText(selection: string, instruction: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  assertAiRequestAllowed(session.user.id, 'report-edit');
  if (
    !selection.trim() ||
    selection.length > 20_000 ||
    !instruction.trim() ||
    instruction.length > 4_000
  ) {
    throw new Error('Invalid edit request');
  }

  const { provider, model, apiKey } = await getUserAiConfig();
  const ai = createAIClient(provider, apiKey);
  const completion = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert editor. Rewrite the text based on the instruction. Return ONLY the rewritten text.',
      },
      {
        role: 'user',
        content: `Original: "${selection}"\nInstruction: ${instruction}\nRewritten:`,
      },
    ],
  });

  return completion.choices[0]?.message?.content || '';
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
    if (!project) throw new Error('Invalid report project');
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
  if (!session?.user?.id) throw new Error('Unauthorized');
  if (!content.trim() || content.length > 100_000) throw new Error('Invalid report content');
  config = validateReportConfig(config);

  if (config.projectId && !(await getOwnedProject(session.user.id, config.projectId))) {
    throw new Error('Invalid report project');
  }

  // Generate a friendly title
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `Report - ${dateStr}`;

  await prisma.report.create({
    data: {
      userId: session.user.id,
      projectId: config.projectId ?? null,
      title,
      content,
      metadata: {
        dateRange: config.dateRange,
        customStartDate: config.customStartDate?.toISOString() ?? null,
        customEndDate: config.customEndDate?.toISOString() ?? null,
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
  if (!session?.user?.id) throw new Error('Unauthorized');

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
  if (!session?.user?.id) throw new Error('Unauthorized');

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
