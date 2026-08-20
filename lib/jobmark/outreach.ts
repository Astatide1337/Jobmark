/**
 * Outreach domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { JobmarkActor, assertActor, NotFoundError, ValidationError } from './index';
import { z } from 'zod';
import { buildOutreachDraft, deterministicRewrite } from '@/lib/deterministic-drafts';

const outreachCreateSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  metadata: z.record(z.string(), z.json()).optional().nullable(),
});

const outreachUpdateSchema = outreachCreateSchema.partial().omit({ contactId: true });

const outreachGenerateSchema = z.object({
  contactId: z.string(),
  goal: z.string().optional(),
  context: z.string().optional(),
  tone: z.string().max(100).optional(),
  channel: z.string().max(100).optional(),
});

export type OutreachInput = z.infer<typeof outreachCreateSchema>;
export type OutreachUpdateInput = z.infer<typeof outreachUpdateSchema>;
export type OutreachGenerateInput = z.infer<typeof outreachGenerateSchema>;

export type OutreachDTO = {
  id: string;
  contactId: string;
  contact: { id: string; fullName: string };
  title: string;
  content: string;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
};

export type OutreachPreviewDTO = {
  id: string;
  contactId: string;
  contact: { id: string; fullName: string };
  title: string;
  contentPreview: string;
  createdAt: string;
};

export async function listOutreach(
  actor: JobmarkActor,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ outreach: OutreachPreviewDTO[]; nextCursor: string | null }> {
  assertActor(actor);

  const { cursor } = options;
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);

  const items = await prisma.outreachDraft.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : undefined,
    include: { contact: { select: { id: true, fullName: true } } },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop();
    nextCursor = next!.id;
  }

  return { outreach: items.map(toOutreachPreviewDTO), nextCursor };
}

export async function generateOutreach(
  actor: JobmarkActor,
  input: OutreachGenerateInput
): Promise<{ generatedContent: string }> {
  assertActor(actor);

  const result = outreachGenerateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const contact = await prisma.contact.findFirst({
    where: { id: result.data.contactId, userId: actor.userId },
    include: { interactions: { orderBy: { occurredAt: 'desc' }, take: 5 } },
  });

  if (!contact) throw new NotFoundError('Contact');

  return {
    generatedContent: buildOutreachDraft(
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
      {
        objective: result.data.goal ?? 'Reconnect',
        tone: result.data.tone ?? 'professional',
        channel: result.data.channel ?? 'email',
        extraContext: result.data.context,
      }
    ),
  };
}

export async function createOutreach(
  actor: JobmarkActor,
  input: OutreachInput
): Promise<OutreachDTO> {
  assertActor(actor);

  const result = outreachCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const contact = await prisma.contact.findFirst({
    where: { id: result.data.contactId, userId: actor.userId },
  });
  if (!contact) throw new NotFoundError('Contact');

  const outreach = await prisma.outreachDraft.create({
    data: {
      userId: actor.userId,
      contactId: result.data.contactId,
      title: result.data.title,
      content: result.data.content,
      metadata: result.data.metadata ?? undefined,
    },
    include: { contact: { select: { id: true, fullName: true } } },
  });

  return toOutreachDTO(outreach);
}

export async function updateOutreach(
  actor: JobmarkActor,
  outreachId: string,
  input: OutreachUpdateInput
): Promise<OutreachDTO> {
  assertActor(actor);

  const result = outreachUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const outreach = await prisma.outreachDraft.findFirst({
    where: { id: outreachId, userId: actor.userId },
  });
  if (!outreach) throw new NotFoundError('Message draft');

  const updated = await prisma.outreachDraft.update({
    where: { id: outreachId },
    data: {
      ...result.data,
      metadata: result.data.metadata ?? undefined,
    },
    include: { contact: { select: { id: true, fullName: true } } },
  });

  return toOutreachDTO(updated);
}

export async function improveOutreachText(
  actor: JobmarkActor,
  outreachId: string,
  instructions?: string
): Promise<{ improvedContent: string }> {
  assertActor(actor);

  const outreach = await prisma.outreachDraft.findFirst({
    where: { id: outreachId, userId: actor.userId },
  });
  if (!outreach) throw new NotFoundError('Message draft');

  return {
    improvedContent: deterministicRewrite(
      outreach.content,
      instructions ?? 'Keep the meaning and make this easier to read.'
    ),
  };
}

export async function deleteOutreach(actor: JobmarkActor, outreachId: string): Promise<void> {
  assertActor(actor);

  const outreach = await prisma.outreachDraft.findFirst({
    where: { id: outreachId, userId: actor.userId },
  });
  if (!outreach) throw new NotFoundError('Message draft');

  await prisma.outreachDraft.delete({ where: { id: outreachId } });
}

type OutreachWithContact = Prisma.OutreachDraftGetPayload<{
  include: { contact: { select: { id: true; fullName: true } } };
}>;

function toOutreachDTO(outreach: OutreachWithContact): OutreachDTO {
  return {
    id: outreach.id,
    contactId: outreach.contactId,
    contact: outreach.contact,
    title: outreach.title,
    content: outreach.content,
    metadata: outreach.metadata,
    createdAt: outreach.createdAt.toISOString(),
  };
}

function toOutreachPreviewDTO(outreach: OutreachWithContact): OutreachPreviewDTO {
  return {
    id: outreach.id,
    contactId: outreach.contactId,
    contact: outreach.contact,
    title: outreach.title,
    contentPreview: outreach.content.slice(0, 200),
    createdAt: outreach.createdAt.toISOString(),
  };
}
