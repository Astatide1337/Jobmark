/**
 * Interactions domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, NotFoundError, ValidationError } from './index';
import { z } from 'zod';

const interactionCreateSchema = z.object({
  contactId: z.string(),
  occurredAt: z.string().datetime(),
  channel: z.string().default('other'),
  summary: z.string(),
  nextStep: z.string().optional().nullable(),
  followUpDate: z.string().datetime().optional().nullable(),
  rawNotes: z.string().optional().nullable(),
});

const interactionUpdateSchema = interactionCreateSchema.partial().omit({ contactId: true });

export type InteractionInput = z.infer<typeof interactionCreateSchema>;
export type InteractionUpdateInput = z.infer<typeof interactionUpdateSchema>;

export type InteractionDTO = {
  id: string;
  contactId: string;
  contact: { id: string; fullName: string };
  occurredAt: string;
  channel: string;
  summary: string;
  nextStep: string | null;
  followUpDate: string | null;
  rawNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listInteractions(
  actor: JobmarkActor,
  options: { contactId?: string; limit?: number; cursor?: string } = {}
): Promise<{ interactions: InteractionDTO[]; nextCursor: string | null }> {
  assertActor(actor);

  const { contactId, limit = 50, cursor } = options;

  const where: any = { userId: actor.userId };
  if (contactId) where.contactId = contactId;

  const interactions = await prisma.interactionLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: { contact: { select: { id: true, fullName: true } } },
  });

  let nextCursor: string | null = null;
  if (interactions.length > limit) {
    const next = interactions.pop();
    nextCursor = next!.id;
  }

  return { interactions: interactions.map(toInteractionDTO), nextCursor };
}

export async function getInteraction(
  actor: JobmarkActor,
  interactionId: string
): Promise<InteractionDTO> {
  assertActor(actor);

  const interaction = await prisma.interactionLog.findFirst({
    where: { id: interactionId, userId: actor.userId },
    include: { contact: { select: { id: true, fullName: true } } },
  });

  if (!interaction) throw new NotFoundError('Interaction');

  return toInteractionDTO(interaction);
}

export async function createInteraction(
  actor: JobmarkActor,
  input: InteractionInput
): Promise<InteractionDTO> {
  assertActor(actor);

  const result = interactionCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const contact = await prisma.contact.findFirst({
    where: { id: result.data.contactId, userId: actor.userId },
  });
  if (!contact) throw new NotFoundError('Contact');

  const data: any = { ...result.data };
  data.occurredAt = new Date(data.occurredAt);
  if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);

  const interaction = await prisma.interactionLog.create({
    data: { ...data, userId: actor.userId },
    include: { contact: { select: { id: true, fullName: true } } },
  });

  return toInteractionDTO(interaction);
}

export async function updateInteraction(
  actor: JobmarkActor,
  interactionId: string,
  input: InteractionUpdateInput
): Promise<InteractionDTO> {
  assertActor(actor);

  const result = interactionUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const interaction = await prisma.interactionLog.findFirst({
    where: { id: interactionId, userId: actor.userId },
  });
  if (!interaction) throw new NotFoundError('Interaction');

  const data: any = { ...result.data };
  if (data.occurredAt) data.occurredAt = new Date(data.occurredAt);
  if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);

  const updated = await prisma.interactionLog.update({
    where: { id: interactionId },
    data,
    include: { contact: { select: { id: true, fullName: true } } },
  });

  return toInteractionDTO(updated);
}

export async function deleteInteraction(
  actor: JobmarkActor,
  interactionId: string
): Promise<void> {
  assertActor(actor);

  const interaction = await prisma.interactionLog.findFirst({
    where: { id: interactionId, userId: actor.userId },
  });
  if (!interaction) throw new NotFoundError('Interaction');

  await prisma.interactionLog.delete({ where: { id: interactionId } });
}

export async function getNetworkStats(actor: JobmarkActor): Promise<{
  totalContacts: number;
  totalInteractions: number;
  interactionsThisMonth: number;
  followUpsDue: number;
}> {
  assertActor(actor);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalContacts, totalInteractions, interactionsThisMonth, followUpsDue] =
    await Promise.all([
      prisma.contact.count({ where: { userId: actor.userId } }),
      prisma.interactionLog.count({ where: { userId: actor.userId } }),
      prisma.interactionLog.count({
        where: { userId: actor.userId, occurredAt: { gte: monthStart } },
      }),
      prisma.interactionLog.count({
        where: { userId: actor.userId, followUpDate: { lte: now, gte: monthStart } },
      }),
    ]);

  return { totalContacts, totalInteractions, interactionsThisMonth, followUpsDue };
}

function toInteractionDTO(interaction: any): InteractionDTO {
  return {
    id: interaction.id,
    contactId: interaction.contactId,
    contact: interaction.contact,
    occurredAt: interaction.occurredAt.toISOString(),
    channel: interaction.channel,
    summary: interaction.summary,
    nextStep: interaction.nextStep,
    followUpDate: interaction.followUpDate?.toISOString() ?? null,
    rawNotes: interaction.rawNotes,
    createdAt: interaction.createdAt.toISOString(),
    updatedAt: interaction.updatedAt.toISOString(),
  };
}