
import { z } from 'zod';
import {
  getSettings,
  updateSettings,
  manageAIKeys,
} from '@/lib/jobmark/settings';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
} from '../errors';
import { createStructuredResult } from '../results';

const settingsUpdateSchema = z.object({
  primaryGoal: z.string().max(500).optional().nullable(),
  goalDeadline: z.string().optional().nullable(),
  whyStatement: z.string().optional().nullable(),
  dailyTarget: z.number().int().min(1).max(100).optional(),
  weeklyTarget: z.number().int().min(1).max(500).optional(),
  monthlyTarget: z.number().int().min(1).max(2000).optional(),
  defaultTone: z.string().optional(),
  customInstructions: z.string().optional().nullable(),
  themePreset: z.string().optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
  hideArchived: z.boolean().optional(),
  showConfetti: z.boolean().optional(),
  timeZone: z.string().optional(),
});

export const settingsGetTool = {
  definition: {
    name: 'settings_get',
    title: 'Get Settings',
    description: 'Get user settings. Requires jobmark:read scope.',
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
    annotations: { readOnlyHint: true },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const settings = await getSettings(actor);
    return createStructuredResult(settings, 'Settings retrieved');
  },
};

export const settingsUpdateTool = {
  definition: {
    name: 'settings_update',
    title: 'Update Settings',
    description: 'Update user settings. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        primaryGoal: { type: 'string', maxLength: 500 },
        goalDeadline: { type: 'string' },
        whyStatement: { type: 'string' },
        dailyTarget: { type: 'number', minimum: 1, maximum: 100 },
        weeklyTarget: { type: 'number', minimum: 1, maximum: 500 },
        monthlyTarget: { type: 'number', minimum: 1, maximum: 2000 },
        defaultTone: { type: 'string' },
        customInstructions: { type: 'string' },
        themePreset: { type: 'string' },
        themeMode: { type: 'string', enum: ['light', 'dark', 'system'] },
        hideArchived: { type: 'boolean' },
        showConfetti: { type: 'boolean' },
        timeZone: { type: 'string' },
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
    annotations: { destructiveHint: false, idempotentHint: true },
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

export const settingsManageAiKeysTool = {
  definition: {
    name: 'settings_manage_ai_keys',
    title: 'Manage AI Provider Keys',
    description: 'Manage AI provider API keys via secure one-time flow. Returns a secure action URL. Requires jobmark:admin scope.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        action: { type: 'string', enum: ['set', 'remove'] },
      },
      required: ['provider', 'action'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        actionUrl: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({
      provider: z.string(),
      action: z.enum(['set', 'remove']),
    }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { actionUrl, expiresAt } = await manageAIKeys(actor, result.data);
    return createStructuredResult({ actionUrl, expiresAt }, 'Secure AI key management URL generated');
  },
};
