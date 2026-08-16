import { z } from 'zod';
import {
  listOutreach,
  generateOutreach,
  createOutreach,
  updateOutreach,
  deleteOutreach,
  improveOutreachText,
} from '@/lib/jobmark/outreach';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError, McpNotFoundError } from '../errors';
import { createStructuredResult } from '../results';
import { getLimit } from '../pagination';

const outreachListSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

const outreachGenerateSchema = z.object({
  contactId: z.string(),
  goal: z.string().optional(),
  context: z.string().optional(),
  tone: z.string().max(100).optional(),
  channel: z.string().max(100).optional(),
});

const outreachCreateSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  metadata: z.record(z.string(), z.json()).optional().nullable(),
});

const outreachUpdateSchema = z.object({
  outreachId: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  metadata: z.record(z.string(), z.json()).optional().nullable(),
});

const outreachDeleteSchema = z.object({ outreachId: z.string() });

const outreachImproveSchema = z.object({
  outreachId: z.string(),
  instructions: z.string().max(500).optional(),
});

export const outreachListTool = {
  definition: {
    name: 'outreach_list',
    title: 'List message drafts',
    description: 'List saved message drafts with pagination. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 50, default: 25 },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        outreach: {
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
              title: { type: 'string' },
              contentPreview: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listOutreach(actor, {
      limit: getLimit('outreach', result.data.limit),
      cursor: result.data.cursor,
    });
    return createStructuredResult(data, `Found ${data.outreach.length} message drafts`);
  },
};

export const outreachGenerateTool = {
  definition: {
    name: 'outreach_generate',
    title: 'Make a message draft',
    description:
      'Make an editable message from a contact and the saved conversations with that person. Let the user review it. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        goal: { type: 'string' },
        context: { type: 'string' },
        tone: { type: 'string' },
        channel: { type: 'string' },
      },
      required: ['contactId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        generatedContent: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachGenerateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const draft = await generateOutreach(actor, result.data);
    return createStructuredResult(draft, 'Message draft created');
  },
};

export const outreachCreateTool = {
  definition: {
    name: 'outreach_create',
    title: 'Save a message draft',
    description: 'Save a message draft. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        content: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['contactId', 'title', 'content'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        contactId: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      requiredScopes: ['jobmark:write'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const outreach = await createOutreach(actor, result.data);
    return createStructuredResult(outreach, 'Message draft saved');
  },
};

export const outreachUpdateTool = {
  definition: {
    name: 'outreach_update',
    title: 'Update a message draft',
    description: 'Update a message draft. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        outreachId: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        content: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['outreachId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      requiredScopes: ['jobmark:write'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { outreachId, ...data } = result.data;
    const outreach = await updateOutreach(actor, outreachId, data);
    return createStructuredResult(outreach, 'Message draft updated');
  },
};

export const outreachDeleteTool = {
  definition: {
    name: 'outreach_delete',
    title: 'Delete a message draft',
    description: 'Delete a message draft. Requires the jobmark:destructive permission.',
    inputSchema: {
      type: 'object',
      properties: {
        outreachId: { type: 'string' },
      },
      required: ['outreachId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
      requiredScopes: ['jobmark:destructive'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteOutreach(actor, result.data.outreachId);
    return createStructuredResult({ success: true }, 'Message draft deleted');
  },
};

export const outreachImproveTextTool = {
  definition: {
    name: 'outreach_improve_text',
    title: 'Edit message draft text',
    description:
      'Make a small edit to a saved message draft. For a larger rewrite, open the draft in a connected assistant. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        outreachId: { type: 'string' },
        instructions: { type: 'string', maxLength: 500 },
      },
      required: ['outreachId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        improvedContent: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachImproveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const improved = await improveOutreachText(
      actor,
      result.data.outreachId,
      result.data.instructions
    );
    return createStructuredResult(improved, 'Message draft text updated');
  },
};
