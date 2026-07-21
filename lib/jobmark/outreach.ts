/**
 * Outreach domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, NotFoundError, ValidationError } from './index';
import { z } from 'zod';

const outreachCreateSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

const outreachUpdateSchema = outreachCreateSchema.partial().omit({ contactId: true });

const outreachGenerateSchema = z.object({
  contactId: z.string(),
  goal: z.string().optional(),
  context: z.string().optional(),
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
  metadata: any | null;
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

  const { limit = 25, cursor } = options;

  const items = await prisma.outreachDraft.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: { contact: { select: { id: true, fullName: true } } },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop();
    nextCursor = next!.id;
  }

  return { outreach: items.map(toOutreachPreviewDTO), nextCursor };
}

export async function getOutreach(actor: JobmarkActor, outreachId: string): Promise<OutreachDTO> {
  assertActor(actor);

  const outreach = await prisma.outreachDraft.findFirst({
    where: { id: outreachId, userId: actor.userId },
    include: { contact: { select: { id: true, fullName: true } } },
  });

  if (!outreach) throw new NotFoundError('Outreach draft');

  return toOutreachDTO(outreach);
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

  // Call AI to generate - placeholder
  return { generatedContent: 'Generated outreach content...' };
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
  if (!outreach) throw new NotFoundError('Outreach draft');

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
  if (!outreach) throw new NotFoundError('Outreach draft');

  // Call AI to improve - placeholder
  return { improvedContent: 'Improved content...' };
}

export async function deleteOutreach(actor: JobmarkActor, outreachId: string): Promise<void> {
  assertActor(actor);

  const outreach = await prisma.outreachDraft.findFirst({
    where: { id: outreachId, userId: actor.userId },
  });
  if (!outreach) throw new NotFoundError('Outreach draft');

  await prisma.outreachDraft.delete({ where: { id: outreachId } });
}

function toOutreachDTO(outreach: any): OutreachDTO {
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

function toOutreachPreviewDTO(outreach: any): OutreachPreviewDTO {
  return {
    id: outreach.id,
    contactId: outreach.contactId,
    contact: outreach.contact,
    title: outreach.title,
    contentPreview: outreach.content.slice(0, 200),
    createdAt: outreach.createdAt.toISOString(),
  };
}