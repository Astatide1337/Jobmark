import { prisma } from '@/lib/db';
import { filterLockedReports, getLockedProjectIds } from '@/lib/project-lock';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/lib/date-semantics';
import { ContextStrategy, ConversationContext } from './types';

/**
 * ReportsContextProvider
 *
 * Why: Allows the AI to "read" previously generated reports. This is critical
 * for the AI to understand historical performance trends and help the user
 * prepare for reviews based on verified summaries of their work.
 *
 * Constraint: We slice report content to 3000 characters to prevent
 * overflowing the LLM's context window while still providing enough
 * substance for meaningful analysis.
 */
export class ReportsContextProvider implements ContextStrategy {
  name = 'ReportsContext';

  shouldRun(conversation: ConversationContext): boolean {
    return conversation.reportIds.length > 0;
  }

  async provide(conversation: ConversationContext, userId: string): Promise<string> {
    if (conversation.reportIds.length === 0) return '';

    const reports = await prisma.report.findMany({
      where: {
        id: { in: conversation.reportIds },
        userId: userId,
      },
      select: {
        title: true,
        content: true,
        createdAt: true,
        projectId: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lockedIds = await getLockedProjectIds(userId);
    const visibleReports = filterLockedReports(reports, lockedIds);
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    });
    const timeZone =
      settings?.timeZone && isValidTimeZone(settings.timeZone)
        ? settings.timeZone
        : DEFAULT_TIME_ZONE;

    let context = '';
    for (const report of visibleReports) {
      const reportDate = report.createdAt.toLocaleDateString('en-US', { timeZone });
      context += `\n\nReferenced Report: "${report.title}" (${reportDate})\n${report.content.slice(0, 3000)}`;
    }
    return context;
  }
}
