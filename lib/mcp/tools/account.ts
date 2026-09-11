import { z } from 'zod';
import { clearActivities } from '@/lib/jobmark/account';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';

const accountClearActivitiesSchema = z.object({
  confirmation: z.literal('DELETE ALL MY NOTES'),
});

export const accountClearActivitiesTool = {
  definition: {
    name: 'account_clear_activities',
    title: 'Clear all notes',
    description:
      'Delete all notes. Type the exact words below. Requires the jobmark:destructive permission.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmation: { type: 'string', pattern: '^DELETE ALL MY NOTES$' },
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
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      requiredScopes: ['jobmark:destructive'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = accountClearActivitiesSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError(
        'Check the confirmation and type DELETE ALL MY NOTES exactly.',
        result.error.flatten().fieldErrors
      );
    }

    const { deletedCount } = await clearActivities(actor, {
      confirmation: result.data.confirmation,
    });
    return createStructuredResult({ deletedCount, success: true }, `Deleted ${deletedCount} notes`);
  },
};
