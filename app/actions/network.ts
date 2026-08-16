/**
 * Network Management Actions (CRM)
 *
 * Why: Maintaining a strong network requires tracking interactions and
 * follow-ups. These actions provide a lightweight "Relationship Manager"
 * directly integrated with the AI-app handoff.
 *
 * Edge Case (Timezones):
 * We use `parseUTCDate` for birthdays and follow-up dates. This ensures
 * that a date entered as "March 2nd" remains "March 2nd" regardless of
 * whether the user (or the server) is in UTC+12 or UTC-12.
 */
'use server';

import { auth, requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseUTCDate } from '@/lib/network';
import {
  DEFAULT_TIME_ZONE,
  getCalendarRange,
  isValidTimeZone,
  shiftCalendarDate,
  zonedCalendarDateToUtc,
} from '@/lib/date-semantics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContactFormState = {
  success: boolean;
  message: string;
  errors?: {
    fullName?: string[];
    phone?: string[];
    email?: string[];
    birthday?: string[];
    relationship?: string[];
    personalityTraits?: string[];
    notes?: string[];
  };
};

export type InteractionFormState = {
  success: boolean;
  message: string;
  errors?: {
    contactId?: string[];
    occurredAt?: string[];
    channel?: string[];
    summary?: string[];
    nextStep?: string[];
    followUpDate?: string[];
    rawNotes?: string[];
  };
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  fullName: z.string().min(1, 'Enter a name.').max(150, 'Keep the name under 150 characters.'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Enter a valid email address.').optional().nullable().or(z.literal('')),
  birthday: z
    .date()
    .refine(d => d <= new Date(), {
      message: 'The birthday cannot be later than today.',
    })
    .optional()
    .nullable(),
  relationship: z.string().optional().nullable(),
  personalityTraits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const interactionSchema = z.object({
  contactId: z.string().min(1, 'Choose a contact.'),
  occurredAt: z.date().optional(),
  channel: z.string().optional().default('other'),
  summary: z
    .string()
    .min(1, 'Add a short summary.')
    .max(5000, 'Keep the summary under 5,000 characters.'),
  nextStep: z.string().optional().nullable(),
  followUpDate: z.date().optional().nullable(),
  rawNotes: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Contact CRUD
// ---------------------------------------------------------------------------

export async function createContact(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to add a contact.' };
  }

  const birthdayVal = formData.get('birthday') as string;

  const rawData = {
    fullName: formData.get('fullName') as string,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    birthday: birthdayVal ? parseUTCDate(birthdayVal) : null,
    relationship: (formData.get('relationship') as string) || null,
    personalityTraits: (formData.get('personalityTraits') as string) || null,
    notes: (formData.get('notes') as string) || null,
  };

  const result = contactSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: 'Check the contact and try again.',
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.contact.create({
      data: {
        userId: session.user.id,
        fullName: result.data.fullName,
        phone: result.data.phone ?? null,
        email: result.data.email ?? null,
        birthday: result.data.birthday ?? null,
        relationship: result.data.relationship ?? null,
        personalityTraits: result.data.personalityTraits ?? null,
        notes: result.data.notes ?? null,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Contact added.' };
  } catch (error) {
    console.error('Failed to create contact:', error);
    return { success: false, message: 'The contact was not saved. Try again.' };
  }
}

export async function updateContact(
  contactId: string,
  data: {
    fullName?: string;
    phone?: string;
    email?: string;
    birthday?: Date | null;
    relationship?: string;
    personalityTraits?: string;
    notes?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Sign in to edit this contact.' };

  try {
    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: 'That contact is no longer available.' };
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        birthday: data.birthday ? parseUTCDate(data.birthday) : data.birthday,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Contact updated.' };
  } catch (error) {
    console.error('Failed to update contact:', error);
    return { success: false, message: 'The contact was not updated. Try again.' };
  }
}

export async function deleteContact(contactId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Sign in to delete this contact.' };

  try {
    await prisma.contact.delete({
      where: {
        id: contactId,
        userId: session.user.id,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Contact deleted.' };
  } catch (error) {
    console.error('Failed to delete contact:', error);
    return { success: false, message: 'The contact was not deleted. Try again.' };
  }
}

// ---------------------------------------------------------------------------
// Contact Queries
// ---------------------------------------------------------------------------

export async function getContacts(search?: string) {
  const targetUserId = await requireUserId();

  const contacts = await prisma.contact.findMany({
    where: {
      userId: targetUserId,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    orderBy: { fullName: 'asc' },
    include: {
      _count: { select: { interactions: true } },
    },
  });

  return contacts;
}

export async function getContactById(contactId: string) {
  const targetUserId = await requireUserId();

  const contact = await prisma.contact.findUnique({
    where: {
      id: contactId,
      userId: targetUserId,
    },
    include: {
      interactions: {
        orderBy: { occurredAt: 'desc' },
        take: 10,
      },
    },
  });

  return contact;
}

// ---------------------------------------------------------------------------
// Interaction CRUD
// ---------------------------------------------------------------------------

export async function createInteraction(
  prevState: InteractionFormState,
  formData: FormData
): Promise<InteractionFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Sign in to save a conversation.' };
  }

  const occurredAtVal = formData.get('occurredAt') as string;
  const followUpDateVal = formData.get('followUpDate') as string;

  const rawData = {
    contactId: formData.get('contactId') as string,
    occurredAt: occurredAtVal ? parseUTCDate(occurredAtVal) : undefined,
    channel: (formData.get('channel') as string) || 'other',
    summary: formData.get('summary') as string,
    nextStep: (formData.get('nextStep') as string) || null,
    followUpDate: followUpDateVal ? parseUTCDate(followUpDateVal) : null,
    rawNotes: (formData.get('rawNotes') as string) || null,
  };

  const result = interactionSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: 'Check the conversation and try again.',
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Verify the contact belongs to this user
    const contact = await prisma.contact.findUnique({
      where: { id: result.data.contactId, userId: session.user.id },
    });

    if (!contact) {
      return { success: false, message: 'That contact is no longer available.' };
    }

    await prisma.interactionLog.create({
      data: {
        userId: session.user.id,
        contactId: result.data.contactId,
        occurredAt: result.data.occurredAt ?? new Date(),
        channel: result.data.channel ?? 'other',
        summary: result.data.summary,
        nextStep: result.data.nextStep ?? null,
        followUpDate: result.data.followUpDate ?? null,
        rawNotes: result.data.rawNotes ?? null,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Conversation saved.' };
  } catch (error) {
    console.error('Failed to create interaction:', error);
    return { success: false, message: 'The conversation was not saved. Try again.' };
  }
}

export async function updateInteraction(
  interactionId: string,
  data: {
    occurredAt?: Date;
    channel?: string;
    summary?: string;
    nextStep?: string | null;
    followUpDate?: Date | null;
    rawNotes?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Sign in to edit this conversation.' };

  try {
    const existing = await prisma.interactionLog.findUnique({
      where: { id: interactionId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: 'That conversation is no longer available.' };
    }

    await prisma.interactionLog.update({
      where: { id: interactionId },
      data: {
        ...data,
        occurredAt: data.occurredAt ? parseUTCDate(data.occurredAt) || data.occurredAt : undefined,
        followUpDate: data.followUpDate ? parseUTCDate(data.followUpDate) : undefined,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Conversation updated.' };
  } catch (error) {
    console.error('Failed to update interaction:', error);
    return { success: false, message: 'The conversation was not updated. Try again.' };
  }
}

export async function deleteInteraction(interactionId: string) {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, message: 'Sign in to delete this conversation.' };

  try {
    await prisma.interactionLog.delete({
      where: {
        id: interactionId,
        userId: session.user.id,
      },
    });

    revalidatePath('/network');
    return { success: true, message: 'Conversation deleted.' };
  } catch (error) {
    console.error('Failed to delete interaction:', error);
    return { success: false, message: 'The conversation was not deleted. Try again.' };
  }
}

// ---------------------------------------------------------------------------
// Interaction Queries
// ---------------------------------------------------------------------------

export async function getInteractionsByContact(contactId: string, limit = 20) {
  const targetUserId = await requireUserId();

  const interactions = await prisma.interactionLog.findMany({
    where: {
      userId: targetUserId,
      contactId,
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });

  return interactions;
}

// ---------------------------------------------------------------------------
// Network Stats
// ---------------------------------------------------------------------------

export async function getNetworkStats() {
  const targetUserId = await requireUserId();

  const now = new Date();
  const settings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
    select: { timeZone: true },
  });
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  const monthRange = getCalendarRange({ kind: 'month', now, timeZone });
  const monthStart = zonedCalendarDateToUtc(monthRange.startDate, timeZone);
  const monthEnd = zonedCalendarDateToUtc(shiftCalendarDate(monthRange.endDate, 1), timeZone);

  const [totalContacts, interactionsThisMonth, followUpsDue] = await Promise.all([
    prisma.contact.count({
      where: { userId: targetUserId },
    }),
    prisma.interactionLog.count({
      where: {
        userId: targetUserId,
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.interactionLog.count({
      where: {
        userId: targetUserId,
        followUpDate: { lte: now },
      },
    }),
  ]);

  return { totalContacts, interactionsThisMonth, followUpsDue };
}
