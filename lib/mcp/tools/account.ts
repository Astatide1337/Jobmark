import { z } from 'zod';
import { clearActivities } from '@/lib/jobmark/account';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';

const accountClearActivitiesSchema = z.object({
  confirmation: z.literal('DELETE ALL MY ACTIVITIES'),
});

export const accountClearActivitiesTool = {
  definition: {
    name: 'account_clear_activities',
    title: 'Clear All Activities',
    description:
      'Permanently delete all activities. Requires exact confirmation phrase. Requires jobmark:destructive scope.',
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
        'Invalid input. Confirmation phrase must be exactly: DELETE ALL MY ACTIVITIES',
        result.error.flatten().fieldErrors
      );
    }

    const { deletedCount } = await clearActivities(actor, {
      confirmation: result.data.confirmation,
    });
    return createStructuredResult(
      { deletedCount, success: true },
      `Permanently deleted ${deletedCount} activities`
    );
  },
};
