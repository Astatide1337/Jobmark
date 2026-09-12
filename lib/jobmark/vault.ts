/**
 * Vault domain functions
 */
import 'server-only';

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
  JobmarkActor,
  assertActor,
  ValidationError,
  NotFoundError,
  UserActionRequiredError,
  VaultLockedError,
} from './index';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
const { hash, compare } = bcrypt;

function getPublicAppUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  if (!value) throw new Error('The public app URL is not set.');
  return value.replace(/\/$/, '');
}

const vaultSetupSchema = z
  .object({
    password: z.string().min(12).max(128),
  })
  .strict();

const vaultUnlockSchema = z
  .object({
    password: z.string().min(12).max(128),
  })
  .strict();

const vaultChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(12).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .strict();

const vaultSetProjectLockedSchema = z
  .object({
    projectId: z.string().min(1).max(100),
    locked: z.boolean(),
  })
  .strict();

type SecureActionNonceStore = Pick<Prisma.TransactionClient, 'secureActionNonce'>;

export type VaultStatusDTO = {
  configured: boolean;
  unlocked: boolean;
  unlockedUntil: string | null;
  lockedProjectCount: number;
};

export async function getVaultStatus(actor: JobmarkActor): Promise<VaultStatusDTO> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { vaultPasswordHash: true },
  });

  const lockedProjects = await prisma.project.count({
    where: { userId: actor.userId, locked: true },
  });

  return {
    configured: !!settings?.vaultPasswordHash,
    unlocked: actor.vaultUnlocked,
    unlockedUntil: actor.vaultUnlocked ? (actor.vaultUnlockedUntil?.toISOString() ?? null) : null,
    lockedProjectCount: lockedProjects,
  };
}

export async function listLockedProjects(actor: JobmarkActor): Promise<{
  projects: { id: string; name: string; color: string }[];
}> {
  assertActor(actor);

  if (!actor.vaultUnlocked) throw new VaultLockedError();

  const projects = await prisma.project.findMany({
    where: { userId: actor.userId, locked: true },
    select: { id: true, name: true, color: true },
  });

  return { projects };
}

export async function beginVaultSetup(
  actor: JobmarkActor
): Promise<{ actionUrl: string; expiresAt: string }> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { vaultPasswordHash: true },
  });

  if (settings?.vaultPasswordHash) {
    throw new ValidationError('Private projects are already set up. Choose Change password.');
  }

  const nonce = await createSecureActionNonce(actor.userId, actor.connectionId, 'vault_setup');
  const actionUrl = `${getPublicAppUrl()}/vault/setup?nonce=${nonce}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  throw new UserActionRequiredError(
    'Open Jobmark to set up your private project password',
    actionUrl,
    expiresAt
  );
}

export async function beginVaultChangePassword(
  actor: JobmarkActor
): Promise<{ actionUrl: string; expiresAt: string }> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    throw new ValidationError('Private projects are not set up yet. Choose Set up first.');
  }

  const nonce = await createSecureActionNonce(
    actor.userId,
    actor.connectionId,
    'vault_change_password'
  );
  const actionUrl = `${getPublicAppUrl()}/vault/change-password?nonce=${nonce}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  throw new UserActionRequiredError(
    'Open Jobmark to change your private project password',
    actionUrl,
    expiresAt
  );
}

export async function beginVaultUnlock(
  actor: JobmarkActor
): Promise<{ actionUrl: string; expiresAt: string }> {
  assertActor(actor);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: actor.userId },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    throw new ValidationError('Private projects are not set up yet.');
  }

  if (actor.vaultUnlocked) {
    throw new ValidationError('Private projects are already open.');
  }

  const nonce = await createSecureActionNonce(actor.userId, actor.connectionId, 'vault_unlock');
  const actionUrl = `${getPublicAppUrl()}/vault/unlock?nonce=${nonce}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  throw new UserActionRequiredError(
    'Open Jobmark to open your private projects',
    actionUrl,
    expiresAt
  );
}

export async function lockVault(actor: JobmarkActor): Promise<void> {
  assertActor(actor);

  // Update connection record to clear vault unlock
  if (actor.connectionId) {
    await prisma.mcpConnection.update({
      where: { id: actor.connectionId },
      data: { vaultUnlockedUntil: null },
    });
  }
}

export async function setProjectLocked(
  actor: JobmarkActor,
  projectId: string,
  locked: boolean
): Promise<{ success: boolean }> {
  assertActor(actor);

  // Hiding an ordinary project is not a private-data read. Opening or
  // reclassifying an already private project still requires the grant.
  if (!locked && !actor.vaultUnlocked) throw new VaultLockedError();

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: actor.userId },
  });

  if (!project) throw new NotFoundError('Project');

  await prisma.project.update({
    where: { id: projectId },
    data: { locked },
  });

  return { success: true };
}

async function createSecureActionNonce(
  userId: string,
  connectionId: string | undefined,
  type: string
): Promise<string> {
  const { randomBytes } = await import('crypto');
  const { createHash } = await import('crypto');
  const rawNonce = randomBytes(32).toString('base64url');
  const nonceHash = createHash('sha256').update(rawNonce).digest('hex');

  await prisma.secureActionNonce.create({
    data: {
      nonceHash,
      userId,
      connectionId: connectionId ?? null,
      type,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return rawNonce;
}

export async function consumeSecureActionNonce(
  rawNonce: string,
  type: string,
  userId: string,
  store: SecureActionNonceStore = prisma
): Promise<{ connectionId: string | null } | null> {
  const { createHash } = await import('crypto');
  const nonceHash = createHash('sha256').update(rawNonce).digest('hex');

  const nonce = await store.secureActionNonce.findUnique({
    where: { nonceHash },
  });

  const now = new Date();
  if (
    !nonce ||
    nonce.used ||
    nonce.expiresAt < now ||
    nonce.userId !== userId ||
    nonce.type !== type
  ) {
    return null;
  }

  const consumed = await store.secureActionNonce.updateMany({
    where: {
      id: nonce.id,
      userId,
      type,
      used: false,
      expiresAt: { gte: now },
    },
    data: { used: true },
  });

  if (consumed.count !== 1) return null;

  return { connectionId: nonce.connectionId };
}

/**
 * Validate a nonce without consuming it. Credential verification must happen
 * before the single-use marker is written so a mistyped password can be
 * retried with the same short-lived link.
 */
export async function validateSecureActionNonce(
  rawNonce: string,
  type: string,
  userId: string
): Promise<{ connectionId: string | null } | null> {
  if (!rawNonce || rawNonce.length > 256) return null;

  const { createHash } = await import('crypto');
  const nonceHash = createHash('sha256').update(rawNonce).digest('hex');
  const nonce = await prisma.secureActionNonce.findUnique({ where: { nonceHash } });
  const now = new Date();

  if (
    !nonce ||
    nonce.used ||
    nonce.expiresAt < now ||
    nonce.userId !== userId ||
    nonce.type !== type
  ) {
    return null;
  }

  return { connectionId: nonce.connectionId };
}
