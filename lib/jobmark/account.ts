/**
 * Account data domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import { buildLockedActivityFilter, getLockedProjectIdsForActor } from '@/lib/project-lock';
import { JobmarkActor, assertActor, ConfirmationRequiredError } from './index';
import { z } from 'zod';

const accountClearActivitiesSchema = z
  .object({
    confirmation: z.literal('DELETE ALL MY NOTES'),
  })
  .strict();

export type AccountClearActivitiesInput = z.infer<typeof accountClearActivitiesSchema>;

export async function clearActivities(
  actor: JobmarkActor,
  input: AccountClearActivitiesInput
): Promise<{ deletedCount: number }> {
  assertActor(actor);

  const parsed = accountClearActivitiesSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConfirmationRequiredError(
      'Type "DELETE ALL MY NOTES" to confirm',
      'DELETE ALL MY NOTES'
    );
  }

  // Notes in locked projects stay hidden, and so untouched, while the vault is closed.
  const lockedIds = await getLockedProjectIdsForActor(actor);
  const deleted = await prisma.activity.deleteMany({
    where: { userId: actor.userId, ...buildLockedActivityFilter(lockedIds) },
  });

  return { deletedCount: deleted.count };
}
