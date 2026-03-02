import { prisma } from '@/lib/db';
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
      },
      orderBy: { createdAt: 'desc' },
    });

    let context = '';
    for (const report of reports) {
      context += `\n\nReferenced Report: "${report.title}" (${report.createdAt.toLocaleDateString()})\n${report.content.slice(0, 3000)}`;
    }
    return context;
  }
}
