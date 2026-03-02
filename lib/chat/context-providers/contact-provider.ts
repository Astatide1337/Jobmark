import { prisma } from '@/lib/db';
import { ContextStrategy, ConversationContext } from './types';
import { formatDate, getChannelLabel } from '@/lib/network';

/**
 * ContactContextProvider
 *
 * Why: Powers the "AI Outreach" and networking advice features. It provides
 * the AI with the contact's background, relationship history, and recent
 * interactions so it can generate highly personalized outreach drafts.
 */
export class ContactContextProvider implements ContextStrategy {
  name = 'ContactContext';

  shouldRun(conversation: ConversationContext): boolean {
    return !!conversation.contactId;
  }

  async provide(conversation: ConversationContext, userId: string): Promise<string> {
    if (!conversation.contactId) return '';

    const contact = await prisma.contact.findUnique({
      where: {
        id: conversation.contactId,
        userId: userId,
      },
      include: {
        interactions: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contact) return '';

    let context = `\n\nReferenced Contact: "${contact.fullName}"${
      contact.relationship ? `\nRelationship: ${contact.relationship}` : ''
    }${contact.personalityTraits ? `\nPersonality/Traits: ${contact.personalityTraits}` : ''}${
      contact.notes ? `\nNotes: ${contact.notes}` : ''
    }`;

    if (contact.interactions.length > 0) {
      context += '\n\nRecent Interactions:';
      for (const interaction of contact.interactions) {
        const dateStr = formatDate(interaction.occurredAt);
        const channelStr = getChannelLabel(interaction.channel);
        context += `\n- ${dateStr} (${channelStr}): ${interaction.summary}${
          interaction.nextStep ? `\n  Next: ${interaction.nextStep}` : ''
        }${interaction.followUpDate ? `\n  Follow-up: ${formatDate(interaction.followUpDate)}` : ''}`;
      }
    }

    return context;
  }
}
