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
import { z } from 'zod';

export type OutreachDraftConfig = {
  contactId: string;
  objective: string;
  tone: string;
  channel: string;
  extraContext?: string;
};

const outreachDraftConfigSchema = z
  .object({
    contactId: z.string().min(1).max(100),
    objective: z.string().trim().min(1).max(1_000),
    tone: z.string().trim().min(1).max(100),
    channel: z.string().trim().min(1).max(100),
    extraContext: z.string().max(4_000).optional(),
  })
  .strict();

const savedDraftSchema = z
  .object({
    draftId: z.string().min(1).max(100),
    content: z.string().min(1).max(100_000),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Deterministic outreach draft generation
// ---------------------------------------------------------------------------

export async function generateOutreachDraft(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Sign in to make a message draft.');
  }
  const parsed = outreachDraftConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Check the message and try again.');
  }
  const { contactId, objective, tone, channel, extraContext } = parsed.data;

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
    throw new Error('That contact is no longer available.');
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
  if (!session?.user?.id) throw new Error('Sign in to save this message draft.');
  const parsedContent = z.string().min(1).max(100_000).safeParse(content);
  const parsedConfig = outreachDraftConfigSchema.safeParse(config);
  if (!parsedContent.success || !parsedConfig.success) {
    throw new Error('Check the message and try again.');
  }
  const safeConfig = parsedConfig.data;

  const contact = await prisma.contact.findUnique({
    where: { id: safeConfig.contactId, userId: session.user.id },
    select: { fullName: true },
  });
  if (!contact) throw new Error('That contact is no longer available.');

  const title = `Message for ${contact.fullName} - ${format(new Date(), 'MMM d')}`;

  await prisma.outreachDraft.create({
    data: {
      userId: session.user.id,
      contactId: safeConfig.contactId,
      title,
      content: parsedContent.data,
      metadata: JSON.parse(JSON.stringify(safeConfig)),
    },
  });

  return { success: true };
}

export async function getOutreachDraftsByContact(contactId: string) {
  const targetUserId = await requireUserId();
  if (!z.string().min(1).max(100).safeParse(contactId).success) return [];

  return prisma.outreachDraft.findMany({
    where: { userId: targetUserId, contactId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteOutreachDraft(draftId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sign in to delete this message draft.');
  if (!z.string().min(1).max(100).safeParse(draftId).success) {
    throw new Error('That message draft is no longer available.');
  }

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
  if (!session?.user?.id) throw new Error('Sign in to edit this message draft.');
  const parsed = savedDraftSchema.safeParse({ draftId, content, title });
  if (!parsed.success) throw new Error('Check the message and try again.');

  await prisma.outreachDraft.update({
    where: { id: parsed.data.draftId, userId: session.user.id },
    data: {
      content: parsed.data.content,
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
    },
  });

  return { success: true };
}
