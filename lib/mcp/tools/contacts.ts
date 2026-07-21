
import { z } from 'zod';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from '@/lib/jobmark/contacts';
import {
  listInteractions,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  getNetworkStats,
} from '@/lib/jobmark/interactions';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
  McpNotFoundError,
} from '../errors';
import { createStructuredResult } from '../results';
import { getLimit } from '../pagination';

const contactListSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

const contactGetSchema = z.object({ contactId: z.string() });

const contactCreateSchema = z.object({
  fullName: z.string().min(1).max(150),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  birthday: z.string().optional().nullable(),
  relationship: z.string().max(120).optional().nullable(),
  personalityTraits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const contactUpdateSchema = z.object({
  contactId: z.string(),
  fullName: z.string().min(1).max(150).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  birthday: z.string().optional().nullable(),
  relationship: z.string().max(120).optional().nullable(),
  personalityTraits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const contactDeleteSchema = z.object({ contactId: z.string() });

export const contactsListTool = {
  definition: {
    name: 'contacts_list',
    title: 'List Contacts',
    description: 'List professional contacts with pagination. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullName: { type: 'string' },
              email: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              relationship: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
      },
    },
    annotations: { readOnlyHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = contactListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listContacts(actor, {
      limit: getLimit('contacts', result.data.limit),
      cursor: result.data.cursor,
    });
    return createStructuredResult(data, `Found ${data.contacts.length} contacts`);
  },
};

export const contactsGetTool = {
  definition: {
    name: 'contacts_get',
    title: 'Get Contact',
    description: 'Get detailed contact information. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
      },
      required: ['contactId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        birthday: { type: ['string', 'null'] },
        relationship: { type: ['string', 'null'] },
        personalityTraits: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = contactGetSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const contact = await getContact(actor, result.data.contactId);
    if (!contact) {
      throw new McpNotFoundError('Contact not found');
    }
    return createStructuredResult(contact, `Contact: ${contact.fullName}`);
  },
};

export const contactsCreateTool = {
  definition: {
    name: 'contacts_create',
    title: 'Create Contact',
    description: 'Create a new professional contact. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', minLength: 1, maxLength: 150 },
        email: { type: ['string', 'null'], format: 'email' },
        phone: { type: ['string', 'null'], maxLength: 50 },
        birthday: { type: ['string', 'null'] },
        relationship: { type: ['string', 'null'], maxLength: 120 },
        personalityTraits: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: ['fullName'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = contactCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const contact = await createContact(actor, result.data);
    return createStructuredResult(contact, `Created contact: ${contact.fullName}`);
  },
};

export const contactsUpdateTool = {
  definition: {
    name: 'contacts_update',
    title: 'Update Contact',
    description: 'Update contact details. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        fullName: { type: 'string', minLength: 1, maxLength: 150 },
        email: { type: ['string', 'null'], format: 'email' },
        phone: { type: ['string', 'null'], maxLength: 50 },
        birthday: { type: ['string', 'null'] },
        relationship: { type: ['string', 'null'], maxLength: 120 },
        personalityTraits: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: ['contactId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = contactUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { contactId, ...data } = result.data;
    const contact = await updateContact(actor, contactId, data);
    return createStructuredResult(contact, `Updated contact: ${contact.fullName}`);
  },
};

export const contactsDeleteTool = {
  definition: {
    name: 'contacts_delete',
    title: 'Delete Contact',
    description: 'Delete a contact and all associated interactions. Requires jobmark:destructive scope.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
      },
      required: ['contactId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = contactDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteContact(actor, result.data.contactId);
    return createStructuredResult({ success: true }, 'Contact deleted');
  },
};
