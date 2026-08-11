
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
import {
  McpValidationError,
  McpNotFoundError,
} from '../errors';
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
});

const outreachCreateSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

const outreachUpdateSchema = z.object({
  outreachId: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

const outreachDeleteSchema = z.object({ outreachId: z.string() });

const outreachImproveSchema = z.object({
  outreachId: z.string(),
  instructions: z.string().max(500).optional(),
});

export const outreachListTool = {
  definition: {
    name: 'outreach_list',
    title: 'List Outreach Messages',
    description: 'List outreach drafts with pagination. Requires jobmark:read scope.',
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
    return createStructuredResult(data, `Found ${data.outreach.length} outreach messages`);
  },
};

export const outreachGenerateTool = {
  definition: {
    name: 'outreach_generate',
    title: 'Generate Outreach Draft',
    description: 'Generate an editable outreach message from a contact and its history. The message is grounded in the record and ready for the user to review. Requires jobmark:write scope.',
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
    return createStructuredResult(draft, 'Outreach draft generated');
  },
};

export const outreachCreateTool = {
  definition: {
    name: 'outreach_create',
    title: 'Create Outreach Draft',
    description: 'Save an outreach draft. Requires jobmark:write scope.',
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
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const outreach = await createOutreach(actor, result.data);
    return createStructuredResult(outreach, 'Outreach draft saved');
  },
};

export const outreachUpdateTool = {
  definition: {
    name: 'outreach_update',
    title: 'Update Outreach Draft',
    description: 'Update an outreach draft. Requires jobmark:write scope.',
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
    annotations: { destructiveHint: false, idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { outreachId, ...data } = result.data;
    const outreach = await updateOutreach(actor, outreachId, data);
    return createStructuredResult(outreach, 'Outreach updated');
  },
};

export const outreachDeleteTool = {
  definition: {
    name: 'outreach_delete',
    title: 'Delete Outreach',
    description: 'Delete an outreach draft. Requires jobmark:destructive scope.',
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
    annotations: { destructiveHint: true, idempotentHint: true, requiredScopes: ['jobmark:destructive'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = outreachDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteOutreach(actor, result.data.outreachId);
    return createStructuredResult({ success: true }, 'Outreach deleted');
  },
};

export const outreachImproveTextTool = {
  definition: {
    name: 'outreach_improve_text',
    title: 'Improve Outreach Text',
    description: 'Apply a predictable edit to a saved outreach draft. For richer writing, use your connected assistant with Jobmark MCP. Requires jobmark:write scope.',
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

    const improved = await improveOutreachText(actor, result.data.outreachId, result.data.instructions);
    return createStructuredResult(improved, 'Outreach text improved');
  },
};
