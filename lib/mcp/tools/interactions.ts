
import { z } from 'zod';
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

const interactionListSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  contactId: z.string().optional(),
});

const interactionCreateSchema = z.object({
  contactId: z.string(),
  occurredAt: z.string().datetime(),
  channel: z.string().default('other'),
  summary: z.string(),
  nextStep: z.string().optional().nullable(),
  followUpDate: z.string().datetime().optional().nullable(),
  rawNotes: z.string().optional().nullable(),
});

const interactionUpdateSchema = z.object({
  interactionId: z.string(),
  occurredAt: z.string().datetime().optional(),
  channel: z.string().optional(),
  summary: z.string().optional(),
  nextStep: z.string().optional().nullable(),
  followUpDate: z.string().datetime().optional().nullable(),
  rawNotes: z.string().optional().nullable(),
});

const interactionDeleteSchema = z.object({ interactionId: z.string() });

export const interactionsListTool = {
  definition: {
    name: 'interactions_list',
    title: 'List Interactions',
    description: 'List contact interactions with pagination and optional contact filter. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
        cursor: { type: 'string' },
        contactId: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        interactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              contactId: { type: 'string' },
              contact: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  fullName: { type: 'string' },
                },
              },
              occurredAt: { type: 'string' },
              channel: { type: 'string' },
              summary: { type: 'string' },
              nextStep: { type: ['string', 'null'] },
              followUpDate: { type: ['string', 'null'] },
              rawNotes: { type: ['string', 'null'] },
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
    const result = interactionListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listInteractions(actor, {
      limit: getLimit('interactions', result.data.limit),
      cursor: result.data.cursor,
      contactId: result.data.contactId,
    });
    return createStructuredResult(data, `Found ${data.interactions.length} interactions`);
  },
};

export const interactionsCreateTool = {
  definition: {
    name: 'interactions_create',
    title: 'Create Interaction',
    description: 'Log a new interaction with a contact. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        occurredAt: { type: 'string', format: 'date-time' },
        channel: { type: 'string', default: 'other' },
        summary: { type: 'string' },
        nextStep: { type: 'string' },
        followUpDate: { type: 'string', format: 'date-time' },
        rawNotes: { type: 'string' },
      },
      required: ['contactId', 'occurredAt', 'summary'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        contactId: { type: 'string' },
        occurredAt: { type: 'string' },
        channel: { type: 'string' },
        summary: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = interactionCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const interaction = await createInteraction(actor, result.data);
    return createStructuredResult(interaction, `Logged ${result.data.channel} interaction with contact`);
  },
};

export const interactionsUpdateTool = {
  definition: {
    name: 'interactions_update',
    title: 'Update Interaction',
    description: 'Update an existing interaction. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        interactionId: { type: 'string' },
        occurredAt: { type: 'string', format: 'date-time' },
        channel: { type: 'string' },
        summary: { type: 'string' },
        nextStep: { type: 'string' },
        followUpDate: { type: 'string', format: 'date-time' },
        rawNotes: { type: 'string' },
      },
      required: ['interactionId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        channel: { type: 'string' },
        summary: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = interactionUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { interactionId, ...data } = result.data;
    const interaction = await updateInteraction(actor, interactionId, data);
    return createStructuredResult(interaction, 'Interaction updated');
  },
};

export const interactionsDeleteTool = {
  definition: {
    name: 'interactions_delete',
    title: 'Delete Interaction',
    description: 'Delete an interaction. Requires jobmark:destructive scope.',
    inputSchema: {
      type: 'object',
      properties: {
        interactionId: { type: 'string' },
      },
      required: ['interactionId'],
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
    const result = interactionDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteInteraction(actor, result.data.interactionId);
    return createStructuredResult({ success: true }, 'Interaction deleted');
  },
};

export const networkStatsTool = {
  definition: {
    name: 'network_stats',
    title: 'Network Statistics',
    description: 'Get network statistics and relationship insights. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        totalContacts: { type: 'number' },
        totalInteractions: { type: 'number' },
        interactionsThisMonth: { type: 'number' },
        followUpsDue: { type: 'number' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const data = await getNetworkStats(actor);
    return createStructuredResult(data, 'Network stats retrieved');
  },
};
