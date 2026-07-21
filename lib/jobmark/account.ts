/**
 * Account data domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, NotFoundError, ValidationError, UserActionRequiredError, ConfirmationRequiredError } from './index';
import { z } from 'zod';

const accountExportSchema = z.object({
  format: z.enum(['json', 'markdown']).default('json'),
});

const accountClearActivitiesSchema = z.object({
  confirmation: z.literal('DELETE ALL MY ACTIVITIES'),
});

const accountDeleteSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export type AccountExportInput = z.infer<typeof accountExportSchema>;
export type AccountClearActivitiesInput = z.infer<typeof accountClearActivitiesSchema>;
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;

export type AccountExportDTO = {
  downloadUrl: string;
  expiresAt: string;
  format: string;
};

export async function exportAccount(
  actor: JobmarkActor,
  input: AccountExportInput
): Promise<AccountExportDTO> {
  assertActor(actor);

  const result = accountExportSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  // Create a secure download link instead of returning all data
  const nonce = await createSecureActionNonce(actor.userId, actor.connectionId, 'account_export');
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account/export/download?nonce=${nonce}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  return { downloadUrl, expiresAt, format: result.data.format };
}

export async function clearActivities(
  actor: JobmarkActor,
  input: AccountClearActivitiesInput
): Promise<void> {
  assertActor(actor);

  const result = accountClearActivitiesSchema.safeParse(input);
  if (!result.success) {
    throw new ConfirmationRequiredError(
      'Type "DELETE ALL MY ACTIVITIES" to confirm',
      'DELETE ALL MY ACTIVITIES'
    );
  }

  // Delete all activities for the user
  await prisma.activity.deleteMany({
    where: { userId: actor.userId },
  });
}

export async function deleteAccount(
  actor: JobmarkActor,
  input: AccountDeleteInput
): Promise<{ actionUrl: string; expiresAt: string }> {
  assertActor(actor);

  const result = accountDeleteSchema.safeParse(input);
  if (!result.success) {
    throw new ConfirmationRequiredError(
      'Type "DELETE MY ACCOUNT" to confirm',
      'DELETE MY ACCOUNT'
    );
  }

  // Require browser confirmation flow
  const nonce = await createSecureActionNonce(actor.userId, actor.connectionId, 'account_delete');
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account/delete?nonce=${nonce}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  throw new UserActionRequiredError(
    'Open Jobmark to confirm account deletion',
    actionUrl,
    expiresAt
  );
}

async function createSecureActionNonce(
  userId: string,
  connectionId: string | undefined,
  type: string
): Promise<string> {
  const nonce = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
  // Store in database with hash, bound to user/connection, with expiry
  // await prisma.secureActionNonce.create({ data: { hash: hashNonce(nonce), userId, connectionId, type, expiresAt: ... } })
  return nonce;
}