import { z } from 'zod';
import { getSettings, updateSettings } from '@/lib/jobmark/settings';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';

const settingsUpdateSchema = z
  .object({
    primaryGoal: z.string().max(500).optional().nullable(),
    goalDeadline: z.string().datetime().optional().nullable(),
    whyStatement: z.string().max(500).optional().nullable(),
    dailyTarget: z.number().int().min(1).max(100).optional(),
    weeklyTarget: z.number().int().min(1).max(500).optional(),
    monthlyTarget: z.number().int().min(1).max(2000).optional(),
    defaultTone: z.enum(['professional', 'casual', 'bullet-points']).optional(),
    customInstructions: z.string().max(4_000).optional().nullable(),
    themePreset: z.string().max(100).optional(),
    themeMode: z.enum(['light', 'dark', 'system']).optional(),
    hideArchived: z.boolean().optional(),
    showConfetti: z.boolean().optional(),
    timeZone: z.string().max(100).optional(),
  })
  .strict();

export const settingsGetTool = {
  definition: {
    name: 'settings_get',
    title: 'Get settings',
    description: 'Get your settings. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        primaryGoal: { type: ['string', 'null'] },
        goalDeadline: { type: ['string', 'null'] },
        whyStatement: { type: ['string', 'null'] },
        dailyTarget: { type: 'number' },
        weeklyTarget: { type: 'number' },
        monthlyTarget: { type: 'number' },
        defaultTone: { type: 'string' },
        customInstructions: { type: ['string', 'null'] },
        themePreset: { type: 'string' },
        themeMode: { type: 'string' },
        hideArchived: { type: 'boolean' },
        showConfetti: { type: 'boolean' },
        timeZone: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const settings = await getSettings(actor);
    return createStructuredResult(settings, 'Settings ready');
  },
};

export const settingsUpdateTool = {
  definition: {
    name: 'settings_update',
    title: 'Update settings',
    description: 'Update your settings. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        primaryGoal: { type: 'string', maxLength: 500 },
        goalDeadline: { type: 'string', format: 'date-time' },
        whyStatement: { type: 'string', maxLength: 500 },
        dailyTarget: { type: 'number', minimum: 1, maximum: 100 },
        weeklyTarget: { type: 'number', minimum: 1, maximum: 500 },
        monthlyTarget: { type: 'number', minimum: 1, maximum: 2000 },
        defaultTone: { type: 'string', enum: ['professional', 'casual', 'bullet-points'] },
        customInstructions: { type: 'string', maxLength: 4000 },
        themePreset: { type: 'string', maxLength: 100 },
        themeMode: { type: 'string', enum: ['light', 'dark', 'system'] },
        hideArchived: { type: 'boolean' },
        showConfetti: { type: 'boolean' },
        timeZone: { type: 'string', maxLength: 100 },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        primaryGoal: { type: ['string', 'null'] },
        themeMode: { type: 'string' },
        timeZone: { type: 'string' },
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
    const result = settingsUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const settings = await updateSettings(actor, result.data);
    return createStructuredResult(settings, 'Settings updated');
  },
};
