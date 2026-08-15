/**
 * Networking draft actions
 *
 * Why: Professional outreach is stressful and time-consuming. These actions
 * build an editable, evidence-safe message from the user's relationship
 * history. A user can then review it locally or ask a connected AI app to
 * polish it, without routing the user's record through a model service inside
 * Jobmark.
 *
 * Security & Accuracy:
 * The draft contains only facts stored in Jobmark; AI-app handoffs also
 * explicitly ask for an editable result and never an automatic send.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { buildOutreachDraft } from '@/lib/deterministic-drafts';

export type OutreachDraftConfig = {
  contactId: string;
  objective: string;
  tone: string;
  channel: string;
  extraContext?: string;
};

// ---------------------------------------------------------------------------
// Deterministic outreach draft generation
// ---------------------------------------------------------------------------

export async function generateOutreachDraft({
  contactId,
  objective,
  tone,
  channel,
  extraContext,
}: {
  contactId: string;
  objective: string;
  tone: string;
  channel: string;
  extraContext?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  if (
    !objective.trim() ||
    objective.length > 1_000 ||
    tone.length > 100 ||
    channel.length > 100 ||
    (extraContext?.length ?? 0) > 4_000
  ) {
    throw new Error('Outreach request is invalid');
  }

  // Fetch contact + recent interactions for context
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, userId: session.user.id },
    include: {
      interactions: {
        orderBy: { occurredAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!contact) {
    throw new Error('Contact not found');
  }

  const content = buildOutreachDraft(
    {
      id: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      relationship: contact.relationship,
      personalityTraits: contact.personalityTraits,
      notes: contact.notes,
      interactions: contact.interactions.map(interaction => ({
        occurredAt: interaction.occurredAt,
        channel: interaction.channel,
        summary: interaction.summary,
        nextStep: interaction.nextStep,
      })),
    },
    { objective, tone, channel, extraContext }
  );

  // The draft is generated synchronously from verified record data, so there
  // is no model call or background request to stream.
  return { output: content };
}

export async function saveOutreachDraftToHistory(
  content: string,
  config: OutreachDraftConfig
): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const contact = await prisma.contact.findUnique({
    where: { id: config.contactId, userId: session.user.id },
    select: { fullName: true },
  });
  if (!contact) throw new Error('Contact not found');

  const title = `${contact.fullName} – ${format(new Date(), 'MMM d')}`;

  await prisma.outreachDraft.create({
    data: {
      userId: session.user.id,
      contactId: config.contactId,
      title,
      content,
      metadata: JSON.parse(JSON.stringify(config)),
    },
  });

  return { success: true };
}

export async function getOutreachDraftsByContact(contactId: string) {
  const targetUserId = await requireUserId();

  return prisma.outreachDraft.findMany({
    where: { userId: targetUserId, contactId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteOutreachDraft(draftId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.outreachDraft.delete({
    where: { id: draftId, userId: session.user.id },
  });

  return { success: true };
}

export async function updateOutreachDraft(
  draftId: string,
  content: string,
  title?: string
): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.outreachDraft.update({
    where: { id: draftId, userId: session.user.id },
    data: { content, ...(title ? { title } : {}) },
  });

  return { success: true };
}
