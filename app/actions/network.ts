"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseUTCDate } from "@/lib/network";

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
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(150, "Full name must be 150 characters or fewer"),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  birthday: z
    .date()
    .refine((d) => d <= new Date(), {
      message: "Birthday cannot be in the future",
    })
    .optional()
    .nullable(),
  relationship: z.string().optional().nullable(),
  personalityTraits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const interactionSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  occurredAt: z.date().optional(),
  channel: z.string().optional().default("other"),
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(5000, "Summary must be 5 000 characters or fewer"),
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
    return { success: false, message: "You must be signed in to add contacts" };
  }

  const birthdayVal = formData.get("birthday") as string;
  
  const rawData = {
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    birthday: birthdayVal ? parseUTCDate(birthdayVal) : null,
    relationship: (formData.get("relationship") as string) || null,
    personalityTraits: (formData.get("personalityTraits") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const result = contactSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed",
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

    revalidatePath("/network");
    return { success: true, message: "Contact added successfully" };
  } catch (error) {
    console.error("Failed to create contact:", error);
    return { success: false, message: "Failed to save contact. Please try again." };
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
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: "Contact not found" };
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        birthday: data.birthday ? parseUTCDate(data.birthday) : data.birthday,
      },
    });

    revalidatePath("/network");
    return { success: true, message: "Contact updated" };
  } catch (error) {
    console.error("Failed to update contact:", error);
    return { success: false, message: "Failed to update contact" };
  }
}

export async function deleteContact(contactId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    await prisma.contact.delete({
      where: {
        id: contactId,
        userId: session.user.id,
      },
    });

    revalidatePath("/network");
    return { success: true, message: "Contact deleted" };
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return { success: false, message: "Failed to delete contact" };
  }
}

// ---------------------------------------------------------------------------
// Contact Queries
// ---------------------------------------------------------------------------

export async function getContacts(search?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const contacts = await prisma.contact.findMany({
    where: {
      userId: session.user.id,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    orderBy: { fullName: "asc" },
    include: {
      _count: { select: { interactions: true } },
    },
  });

  return contacts;
}

export async function getContactById(contactId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const contact = await prisma.contact.findUnique({
    where: {
      id: contactId,
      userId: session.user.id,
    },
    include: {
      interactions: {
        orderBy: { occurredAt: "desc" },
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
    return { success: false, message: "You must be signed in to log interactions" };
  }

  const occurredAtVal = formData.get("occurredAt") as string;
  const followUpDateVal = formData.get("followUpDate") as string;

  const rawData = {
    contactId: formData.get("contactId") as string,
    occurredAt: occurredAtVal ? parseUTCDate(occurredAtVal) : undefined,
    channel: (formData.get("channel") as string) || "other",
    summary: formData.get("summary") as string,
    nextStep: (formData.get("nextStep") as string) || null,
    followUpDate: followUpDateVal ? parseUTCDate(followUpDateVal) : null,
    rawNotes: (formData.get("rawNotes") as string) || null,
  };

  const result = interactionSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Verify the contact belongs to this user
    const contact = await prisma.contact.findUnique({
      where: { id: result.data.contactId, userId: session.user.id },
    });

    if (!contact) {
      return { success: false, message: "Contact not found" };
    }

    await prisma.interactionLog.create({
      data: {
        userId: session.user.id,
        contactId: result.data.contactId,
        occurredAt: result.data.occurredAt ?? new Date(),
        channel: result.data.channel ?? "other",
        summary: result.data.summary,
        nextStep: result.data.nextStep ?? null,
        followUpDate: result.data.followUpDate ?? null,
        rawNotes: result.data.rawNotes ?? null,
      },
    });

    revalidatePath("/network");
    return { success: true, message: "Interaction logged successfully" };
  } catch (error) {
    console.error("Failed to create interaction:", error);
    return { success: false, message: "Failed to save interaction. Please try again." };
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
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    const existing = await prisma.interactionLog.findUnique({
      where: { id: interactionId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, message: "Interaction not found" };
    }

    await prisma.interactionLog.update({
      where: { id: interactionId },
      data: {
        ...data,
        occurredAt: data.occurredAt ? (parseUTCDate(data.occurredAt) || data.occurredAt) : undefined,
        followUpDate: data.followUpDate ? parseUTCDate(data.followUpDate) : undefined,
      },
    });

    revalidatePath("/network");
    return { success: true, message: "Interaction updated" };
  } catch (error) {
    console.error("Failed to update interaction:", error);
    return { success: false, message: "Failed to update interaction" };
  }
}

export async function deleteInteraction(interactionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  try {
    await prisma.interactionLog.delete({
      where: {
        id: interactionId,
        userId: session.user.id,
      },
    });

    revalidatePath("/network");
    return { success: true, message: "Interaction deleted" };
  } catch (error) {
    console.error("Failed to delete interaction:", error);
    return { success: false, message: "Failed to delete interaction" };
  }
}

// ---------------------------------------------------------------------------
// Interaction Queries
// ---------------------------------------------------------------------------

export async function getInteractionsByContact(contactId: string, limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const interactions = await prisma.interactionLog.findMany({
    where: {
      userId: session.user.id,
      contactId,
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return interactions;
}

// ---------------------------------------------------------------------------
// Network Stats
// ---------------------------------------------------------------------------

export async function getNetworkStats() {
  const session = await auth();

  if (!session?.user?.id) {
    return { totalContacts: 0, interactionsThisMonth: 0, followUpsDue: 0 };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalContacts, interactionsThisMonth, followUpsDue] = await Promise.all([
    prisma.contact.count({
      where: { userId: session.user.id },
    }),
    prisma.interactionLog.count({
      where: {
        userId: session.user.id,
        occurredAt: { gte: startOfMonth },
      },
    }),
    prisma.interactionLog.count({
      where: {
        userId: session.user.id,
        followUpDate: { lte: now },
      },
    }),
  ]);

  return { totalContacts, interactionsThisMonth, followUpsDue };
}
