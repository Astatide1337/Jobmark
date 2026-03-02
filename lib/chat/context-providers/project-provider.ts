import { prisma } from '@/lib/db';
import { ContextStrategy, ConversationContext } from './types';

/**
 * ProjectContextProvider
 *
 * Why: When a user selects a project in the chat, the AI needs to know the
 * specific details and recent accomplishments within that project to act
 * as a specialized project mentor.
 *
 * Logic:
 * - In 'interview' mode, it fetches more activities (20) to provide a
 *   detailed timeline for mock interview prep.
 * - In standard mode, it fetches the last 10 activities to provide
 *   immediate context for current work.
 */
export class ProjectContextProvider implements ContextStrategy {
  name = 'ProjectContext';

  shouldRun(conversation: ConversationContext): boolean {
    return !!conversation.projectId;
  }

  async provide(conversation: ConversationContext, userId: string): Promise<string> {
    if (!conversation.projectId) return '';

    const project = await prisma.project.findUnique({
      where: {
        id: conversation.projectId,
        userId: userId,
      },
      include: {
        _count: { select: { activities: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: conversation.mode === 'interview' ? 20 : 10,
          select: { content: true, createdAt: true },
        },
      },
    });

    if (!project) return '';

    if (conversation.mode === 'interview') {
      const timeline = project.activities
        .map(a => {
          const dateStr = a.createdAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          return `- [${dateStr}] ${a.content}`;
        })
        .join('\n');

      return `\n\nProject for Interview: "${project.name}"${
        project.description ? `\nDescription: ${project.description}` : ''
      }\nTotal activities: ${project._count.activities}\n\nRecent Work (use these for context-specific questions):\n${timeline}`;
    }

    let context = `\n\nReferenced Project: "${project.name}"${
      project.description ? `\nDescription: ${project.description}` : ''
    }\nActivities logged: ${project._count.activities}`;

    if (project.activities.length > 0) {
      context += `\nRecent work:\n${project.activities
        .slice(0, 5)
        .map(activity => `- ${activity.content}`)
        .join('\n')}`;
    }

    return context;
  }
}
