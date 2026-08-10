/**
 * Contacts domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, NotFoundError, ValidationError } from './index';
import { z } from 'zod';

const contactCreateSchema = z.object({
  fullName: z.string().min(1).max(150),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  birthday: z.string().datetime().optional().nullable(),
  relationship: z.string().max(120).optional().nullable(),
  personalityTraits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const contactUpdateSchema = contactCreateSchema.partial();

export type ContactInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export type ContactDTO = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  relationship: string | null;
  personalityTraits: string | null;
  notes: string | null;
  _count: { interactions: number; outreachDrafts: number };
  createdAt: string;
  updatedAt: string;
};

export async function listContacts(
  actor: JobmarkActor,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ contacts: ContactDTO[]; nextCursor: string | null }> {
  assertActor(actor);

  const { limit = 50, cursor } = options;

  const contacts = await prisma.contact.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: { _count: { select: { interactions: true, outreachDrafts: true } } },
  });

  let nextCursor: string | null = null;
  if (contacts.length > limit) {
    const next = contacts.pop();
    nextCursor = next!.id;
  }

  return { contacts: contacts.map(toContactDTO), nextCursor };
}

export async function getContact(actor: JobmarkActor, contactId: string): Promise<ContactDTO> {
  assertActor(actor);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: actor.userId },
    include: { _count: { select: { interactions: true, outreachDrafts: true } } },
  });

  if (!contact) throw new NotFoundError('Contact');

  return toContactDTO(contact);
}

export async function createContact(actor: JobmarkActor, input: ContactInput): Promise<ContactDTO> {
  assertActor(actor);

  const result = contactCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const contact = await prisma.contact.create({
    data: {
      userId: actor.userId,
      fullName: result.data.fullName,
      email: result.data.email,
      phone: result.data.phone,
      birthday: result.data.birthday ? new Date(result.data.birthday) : null,
      relationship: result.data.relationship,
      personalityTraits: result.data.personalityTraits,
      notes: result.data.notes,
    },
    include: { _count: { select: { interactions: true, outreachDrafts: true } } },
  });

  return toContactDTO(contact);
}

export async function updateContact(
  actor: JobmarkActor,
  contactId: string,
  input: ContactUpdateInput
): Promise<ContactDTO> {
  assertActor(actor);

  const result = contactUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: actor.userId },
  });

  if (!contact) throw new NotFoundError('Contact');

  const data: any = { ...result.data };
  if (data.birthday) data.birthday = new Date(data.birthday);

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data,
    include: { _count: { select: { interactions: true, outreachDrafts: true } } },
  });

  return toContactDTO(updated);
}

export async function deleteContact(actor: JobmarkActor, contactId: string): Promise<void> {
  assertActor(actor);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: actor.userId },
  });

  if (!contact) throw new NotFoundError('Contact');

  await prisma.contact.delete({ where: { id: contactId } });
}

function toContactDTO(contact: any): ContactDTO {
  return {
    id: contact.id,
    fullName: contact.fullName,
    email: contact.email,
    phone: contact.phone,
    birthday: contact.birthday?.toISOString() ?? null,
    relationship: contact.relationship,
    personalityTraits: contact.personalityTraits,
    notes: contact.notes,
    _count: contact._count,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}