/**
 * Account data domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, ConfirmationRequiredError } from './index';
import { z } from 'zod';

const accountClearActivitiesSchema = z.object({
  confirmation: z.literal('DELETE ALL MY ACTIVITIES'),
});

export type AccountClearActivitiesInput = z.infer<typeof accountClearActivitiesSchema>;

export async function clearActivities(
  actor: JobmarkActor,
  input: AccountClearActivitiesInput
): Promise<{ deletedCount: number }> {
  assertActor(actor);

  const parsed = accountClearActivitiesSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConfirmationRequiredError(
      'Type "DELETE ALL MY ACTIVITIES" to confirm',
      'DELETE ALL MY ACTIVITIES'
    );
  }

  // Delete all activities for the user
  const deleted = await prisma.activity.deleteMany({
    where: { userId: actor.userId },
  });

  return { deletedCount: deleted.count };
}
