import { z } from 'zod';
import {
  getFocusConfig,
  saveFocusConfig,
  resetFocusConfig,
  logDecompression,
  polishDictation,
} from '@/lib/jobmark/focus';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';
import { focusConfigSchema } from '@/lib/focus/schema';

const focusSaveSchema = z.object({ blocks: focusConfigSchema }).strict();

const focusBlockInputSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 100 },
        type: { const: 'affirmation' },
        config: {
          type: 'object',
          properties: {
            texts: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: { type: 'string', minLength: 1, maxLength: 500 },
            },
            totalDuration: { type: 'integer', minimum: 1, maximum: 3600 },
          },
          required: ['texts', 'totalDuration'],
          additionalProperties: false,
        },
      },
      required: ['id', 'type', 'config'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 100 },
        type: { const: 'breathing' },
        config: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              enum: ['box', '4-7-8', 'physiological-sigh', 'resonance'],
            },
            cycles: { type: 'integer', minimum: 1, maximum: 20 },
          },
          required: ['pattern', 'cycles'],
          additionalProperties: false,
        },
      },
      required: ['id', 'type', 'config'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 100 },
        type: { const: 'goal' },
        config: {
          type: 'object',
          properties: {
            goalId: { type: 'string', minLength: 1, maxLength: 100 },
            duration: { type: 'integer', minimum: 1, maximum: 3600 },
          },
          required: ['duration'],
          additionalProperties: false,
        },
      },
      required: ['id', 'type', 'config'],
      additionalProperties: false,
    },
  ],
};

const decompressionLogSchema = z
  .object({
    durationMinutes: z.number().int().min(1).max(480),
    moodBefore: z.number().int().min(1).max(10),
    moodAfter: z.number().int().min(1).max(10),
    notes: z.string().max(10_000).optional().nullable(),
  })
  .strict();

const dictationPolishSchema = z
  .object({
    text: z.string().min(1).max(5000),
    instructions: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const focusGetTool = {
  definition: {
    name: 'focus_get',
    title: 'Get focus settings',
    description: 'Get the current focus settings. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        blocks: { type: 'array', minItems: 1, maxItems: 30, items: focusBlockInputSchema },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const config = await getFocusConfig(actor);
    return createStructuredResult(config, 'Focus settings ready');
  },
};

export const focusSaveTool = {
  definition: {
    name: 'focus_save',
    title: 'Save focus settings',
    description: 'Save or update focus settings. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        blocks: { type: 'array', minItems: 1, maxItems: 30, items: focusBlockInputSchema },
      },
      required: ['blocks'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        blocks: { type: 'array', minItems: 1, maxItems: 30, items: focusBlockInputSchema },
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
    const result = focusSaveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const config = await saveFocusConfig(actor, result.data.blocks);
    return createStructuredResult(config, 'Focus settings saved');
  },
};

export const focusResetTool = {
  definition: {
    name: 'focus_reset',
    title: 'Reset focus settings',
    description: 'Reset focus settings to the defaults. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        blocks: { type: 'array', maxItems: 30 },
      },
    },
    annotations: { destructiveHint: true, idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const config = await resetFocusConfig(actor);
    return createStructuredResult(config, 'Focus settings reset');
  },
};

export const focusLogDecompressionTool = {
  definition: {
    name: 'focus_log_decompression',
    title: 'Save a focus session',
    description: 'Save a focus session after you reset. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        durationMinutes: { type: 'number', minimum: 1, maximum: 480 },
        moodBefore: { type: 'number', minimum: 1, maximum: 10 },
        moodAfter: { type: 'number', minimum: 1, maximum: 10 },
        notes: { type: 'string', maxLength: 10000 },
      },
      required: ['durationMinutes', 'moodBefore', 'moodAfter'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        durationMinutes: { type: 'number' },
        moodBefore: { type: 'number' },
        moodAfter: { type: 'number' },
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
    const result = decompressionLogSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const log = await logDecompression(actor, result.data);
    return createStructuredResult(log, 'Focus session saved');
  },
};

export const dictationPolishTool = {
  definition: {
    name: 'dictation_polish',
    title: 'Clean up dictated text',
    description: 'Clean up dictated text in Jobmark. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 5000 },
        instructions: { type: 'string', maxLength: 2000 },
      },
      required: ['text'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        polishedText: { type: 'string' },
        originalText: { type: 'string' },
      },
    },
    annotations: { openWorldHint: true, destructiveHint: false, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = dictationPolishSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const polished = await polishDictation(actor, result.data);
    return createStructuredResult(
      { ...polished, originalText: result.data.text },
      'Dictated text cleaned up'
    );
  },
};
