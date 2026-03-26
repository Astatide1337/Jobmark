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

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLockedProjectIds, filterLockedReports } from '@/lib/project-lock';
import { createStreamableValue } from '@ai-sdk/rsc';
import OpenAI from 'openai';

/**
 * Lazy OpenAI client factory.
 *
 * Why: Instantiating `new OpenAI()` at module-level throws immediately
 * when `OPENROUTER_API_KEY` is not set (e.g. during build or cold boot),
 * crashing every route that imports this module — even ones that never call
 * the AI. Deferring construction to call-time limits the failure to the
 * specific functions that actually need it.
 */
function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

export type ReportConfig = {
  dateRange: '7d' | '30d' | 'month' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  projectId?: string | null; // null means unassigned
  tone: 'professional' | 'casual' | 'bullet-points';
  notes?: string;
};

// Streaming report generation
export async function streamReport(config: ReportConfig) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // 1. Calculate date range
  let startDate = new Date();
  let endDate = new Date(); // Default to now

  if (config.dateRange === 'custom' && config.customStartDate && config.customEndDate) {
    startDate = config.customStartDate;
    // Ensure we go to the END of the end date
    endDate = config.customEndDate;
    endDate.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    switch (config.dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'month':
        startDate.setDate(1);
        break;
    }
  }

  // 2. Guard locked projects
  const lockedIds = await getLockedProjectIds(session.user.id);

  // If specific project is locked and vault is closed, block
  if (config.projectId && lockedIds.includes(config.projectId)) {
    throw new Error('This project is locked.');
  }

  // 2b. Fetch activities
  const activities = await prisma.activity.findMany({
    where: {
      userId: session.user.id,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      // Handle "Unassigned" (null) vs specific project vs All (undefined in typical filter logic, but here we expect explicit selection)
      projectId: config.projectId === undefined ? undefined : config.projectId,
      // Exclude locked project activities when generating "all projects" report
      ...(config.projectId === undefined && lockedIds.length > 0 && {
        OR: [
          { projectId: null },
          { projectId: { notIn: lockedIds } },
        ],
      }),
    },
    orderBy: { createdAt: 'asc' },
    include: {
      project: true,
    },
  });

  if (activities.length === 0) {
    throw new Error('No activities found for this period.');
  }

  // 3. Format log
  const activityLog = activities
    .map(a => {
      // Force EST/EDT for this user to avoid UTC day shifts
      const dateStr = a.createdAt.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
      });
      return `- [${dateStr}] ${a.project ? `[${a.project.name}] ` : '[Unassigned] '}${a.content}`;
    })
    .join('\n');

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
  Activity Log (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}):
  ${activityLog}

  User Notes: ${config.notes || 'None'}

  Instructions:
  Generate a report based on the log. Group by project/theme.
  - **No Intro Fluff**: Do not say "Here is the report" or "The log covers...".
  - **Structure**: Group related tasks together logically.
  - **User Overrides**: PRIORITIZE any instructions provided in "User Notes" above.
  `;

  // 5. Stream
  const stream = createStreamableValue('');

  (async () => {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: 'z-ai/glm-4.5-air:free',
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
      console.error('OpenAI Stream Error:', err);
      stream.error(err);
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

  const completion = await getOpenAI().chat.completions.create({
    model: 'z-ai/glm-4.5-air:free',
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

  let startDate = new Date();
  let endDate = new Date();

  if (config.dateRange === 'custom' && config.customStartDate) {
    startDate = config.customStartDate;
    // Ensure we go to the END of the end date
    endDate = config.customEndDate || new Date();
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Replicate date logic from streamReport
    const now = new Date();
    switch (config.dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'month':
        startDate.setDate(1);
        break;
    }
  }

  const lockedIds = await getLockedProjectIds(session.user.id);

  // If specific project is locked, return 0
  if (config.projectId && lockedIds.includes(config.projectId)) {
    return { count: 0 };
  }

  const count = await prisma.activity.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: startDate, lte: endDate },
      projectId: config.projectId === undefined ? undefined : config.projectId,
      ...(config.projectId === undefined && lockedIds.length > 0 && {
        OR: [
          { projectId: null },
          { projectId: { notIn: lockedIds } },
        ],
      }),
    },
  });

  return { count };
}

// Save to History
export async function saveReportToHistory(content: string, config: ReportConfig) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Generate a friendly title
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `Report - ${dateStr}`;

  await prisma.report.create({
    data: {
      userId: session.user.id,
      title,
      content,
      metadata: config as any,
    },
  });

  return { success: true };
}

// Get saved reports
export async function getReports(userId?: string) {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) return [];
    targetUserId = session.user.id;
  }

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
