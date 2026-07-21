
import { z } from 'zod';
import {
  exportAccount,
  clearActivities,
  deleteAccount,
} from '@/lib/jobmark/account';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
  McpForbiddenError,
} from '../errors';
import { createStructuredResult } from '../results';

const accountExportSchema = z.object({
  format: z.enum(['json', 'markdown']).default('json'),
  includeVault: z.boolean().default(false),
});

const accountClearActivitiesSchema = z.object({
  confirmation: z.literal('DELETE ALL MY ACTIVITIES'),
});

export const accountExportTool = {
  definition: {
    name: 'account_export',
    title: 'Export Account Data',
    description: 'Export all account data via secure one-time download link. Requires jobmark:admin scope.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'markdown'], default: 'json' },
        includeVault: { type: 'boolean', default: false },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        downloadUrl: { type: 'string', format: 'uri' },
        expiresAt: { type: 'string' },
        format: { type: 'string' },
        includesVault: { type: 'boolean' },
      },
    },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = accountExportSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { downloadUrl, expiresAt } = await exportAccount(actor, result.data);
    return createStructuredResult({ downloadUrl, expiresAt, format: result.data.format, includesVault: result.data.includeVault }, 'Export ready for download');
  },
};

export const accountClearActivitiesTool = {
  definition: {
    name: 'account_clear_activities',
    title: 'Clear All Activities',
    description: 'Permanently delete all activities. Requires exact confirmation phrase. Requires jobmark:destructive scope.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmation: { type: 'string', pattern: '^DELETE ALL MY ACTIVITIES$' },
      },
      required: ['confirmation'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
        success: { type: 'boolean' },
      },
    },
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = accountClearActivitiesSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input. Confirmation phrase must be exactly: DELETE ALL MY ACTIVITIES', result.error.flatten().fieldErrors);
    }

    const deletedCount = await clearActivities(actor, { confirmation: result.data.confirmation });
    return createStructuredResult({ deletedCount, success: true }, `Permanently deleted ${deletedCount} activities`);
  },
};

export const accountDeleteTool = {
  definition: {
    name: 'account_delete',
    title: 'Delete Account',
    description: 'Permanently delete account and all data via secure one-time flow. Requires jobmark:admin scope.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmation: { type: 'string', pattern: '^DELETE MY ACCOUNT$' },
      },
      required: ['confirmation'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        actionUrl: { type: 'string', format: 'uri' },
        expiresAt: { type: 'string' },
      },
    },
    annotations: { destructiveHint: true, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const parsed = z.object({ confirmation: z.literal('DELETE MY ACCOUNT') }).safeParse(input);
    if (!parsed.success) {
      throw new McpValidationError('Invalid input. Confirmation must be exactly: DELETE MY ACCOUNT', parsed.error.flatten().fieldErrors);
    }
    const { actionUrl, expiresAt } = await deleteAccount(actor, parsed.data);
    return createStructuredResult({ actionUrl, expiresAt }, 'Account deletion initiated via secure flow');
  },
};