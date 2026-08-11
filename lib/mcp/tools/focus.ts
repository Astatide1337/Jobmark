
import { z } from 'zod';
import {
  getFocusConfig,
  saveFocusConfig,
  resetFocusConfig,
  logDecompression,
  polishDictation,
} from '@/lib/jobmark/focus';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
} from '../errors';
import { createStructuredResult } from '../results';

const focusSaveSchema = z.object({
  enabled: z.boolean(),
  workDuration: z.number().min(1).max(120),
  breakDuration: z.number().min(1).max(60),
  longBreakDuration: z.number().min(1).max(120),
  sessionsUntilLongBreak: z.number().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartWork: z.boolean(),
  soundEnabled: z.boolean(),
  soundVolume: z.number().min(0).max(1),
  dailyTarget: z.number().min(1).max(20),
});

const decompressionLogSchema = z.object({
  durationMinutes: z.number().int().min(1).max(480),
  moodBefore: z.number().int().min(1).max(10),
  moodAfter: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional().nullable(),
});

const dictationPolishSchema = z.object({
  text: z.string().min(1).max(5000),
  instructions: z.string().max(2000).optional().nullable(),
});

export const focusGetTool = {
  definition: {
    name: 'focus_get',
    title: 'Get Focus Config',
    description: 'Get the current focus/Pomodoro configuration. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        workDuration: { type: 'number' },
        breakDuration: { type: 'number' },
        longBreakDuration: { type: 'number' },
        sessionsUntilLongBreak: { type: 'number' },
        autoStartBreaks: { type: 'boolean' },
        autoStartWork: { type: 'boolean' },
        soundEnabled: { type: 'boolean' },
        soundVolume: { type: 'number' },
        dailyTarget: { type: 'number' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const config = await getFocusConfig(actor);
    return createStructuredResult(config, 'Focus config retrieved');
  },
};

export const focusSaveTool = {
  definition: {
    name: 'focus_save',
    title: 'Save Focus Config',
    description: 'Save or update focus/Pomodoro configuration. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        workDuration: { type: 'number', minimum: 1, maximum: 120 },
        breakDuration: { type: 'number', minimum: 1, maximum: 60 },
        longBreakDuration: { type: 'number', minimum: 1, maximum: 120 },
        sessionsUntilLongBreak: { type: 'number', minimum: 1, maximum: 10 },
        autoStartBreaks: { type: 'boolean' },
        autoStartWork: { type: 'boolean' },
        soundEnabled: { type: 'boolean' },
        soundVolume: { type: 'number', minimum: 0, maximum: 1 },
        dailyTarget: { type: 'number', minimum: 1, maximum: 20 },
      },
      required: ['enabled', 'workDuration', 'breakDuration', 'longBreakDuration', 'sessionsUntilLongBreak', 'autoStartBreaks', 'autoStartWork', 'soundEnabled', 'soundVolume', 'dailyTarget'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        workDuration: { type: 'number' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = focusSaveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const config = await saveFocusConfig(actor, result.data);
    return createStructuredResult(config, 'Focus config saved');
  },
};

export const focusResetTool = {
  definition: {
    name: 'focus_reset',
    title: 'Reset Focus Config',
    description: 'Reset focus config to defaults. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        workDuration: { type: 'number' },
      },
    },
    annotations: { destructiveHint: true, idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const config = await resetFocusConfig(actor);
    return createStructuredResult(config, 'Focus config reset to defaults');
  },
};

export const focusLogDecompressionTool = {
  definition: {
    name: 'focus_log_decompression',
    title: 'Log Decompression Session',
    description: 'Log a decompression session after focus work. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        durationMinutes: { type: 'number', minimum: 1, maximum: 480 },
        moodBefore: { type: 'number', minimum: 1, maximum: 10 },
        moodAfter: { type: 'number', minimum: 1, maximum: 10 },
        notes: { type: 'string', maxLength: 1000 },
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
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = decompressionLogSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const log = await logDecompression(actor, result.data);
    return createStructuredResult(log, `Logged decompression session`);
  },
};

export const dictationPolishTool = {
  definition: {
    name: 'dictation_polish',
    title: 'Polish Dictation Text',
    description: 'Clean up raw dictation text without an external provider. Requires jobmark:write scope.',
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
    return createStructuredResult({ ...polished, originalText: result.data.text }, 'Dictation polished');
  },
};
