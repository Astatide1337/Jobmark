/**
 * Vault (Password-Locked Projects) Server Actions
 *
 * Why: These actions manage the vault lifecycle — setting up the password,
 * unlocking/locking the vault, and moving projects in/out of the vault.
 *
 * Security:
 * - Passwords are hashed with bcrypt (cost 12).
 * - There is no password recovery. If forgotten, manual DB intervention is required.
 * - Vault unlock state is tracked via an encrypted session cookie (see lib/project-lock.ts).
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isVaultUnlocked, setVaultUnlocked, getLockedProjectIds } from '@/lib/project-lock';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

const BCRYPT_COST = 12;

/**
 * Set the vault password for the first time.
 */
export async function setVaultPassword(password: string, confirmPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  if (password !== confirmPassword) {
    return { success: false, message: 'Passwords do not match' };
  }

  // Check if password already exists
  const existing = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (existing?.vaultPasswordHash) {
    return { success: false, message: 'Vault password is already set. Use change password instead.' };
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { vaultPasswordHash: hash },
    create: { userId: session.user.id, vaultPasswordHash: hash },
  });

  // Auto-unlock after setting password
  await setVaultUnlocked(true);
  revalidatePath('/projects');
  revalidatePath('/chat', 'layout');

  return { success: true, message: 'Vault password set successfully' };
}

/**
 * Change the vault password.
 */
export async function changeVaultPassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters' };
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    return { success: false, message: 'No vault password is set' };
  }

  const isValid = await bcrypt.compare(currentPassword, settings.vaultPasswordHash);
  if (!isValid) {
    return { success: false, message: 'Current password is incorrect' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.userSettings.update({
    where: { userId: session.user.id },
    data: { vaultPasswordHash: hash },
  });

  return { success: true, message: 'Vault password changed successfully' };
}

/**
 * Unlock the vault by verifying the password.
 */
export async function unlockVault(password: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    return { success: false, message: 'No vault password is set' };
  }

  const isValid = await bcrypt.compare(password, settings.vaultPasswordHash);
  if (!isValid) {
    return { success: false, message: 'Incorrect password' };
  }

  await setVaultUnlocked(true);
  revalidatePath('/projects');
  revalidatePath('/chat', 'layout');

  return { success: true, message: 'Vault unlocked' };
}

/**
 * Lock the vault (clear the unlock cookie).
 */
export async function lockVault() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  await setVaultUnlocked(false);
  revalidatePath('/projects');
  revalidatePath('/chat', 'layout');

  return { success: true, message: 'Vault locked' };
}

/**
 * Move a project into the vault (set locked = true).
 * No password needed — user is already authenticated.
 * Requires vault password to be set first.
 */
export async function moveProjectToVault(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  // Ensure vault password is set
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    return { success: false, message: 'Set up a vault password first' };
  }

  await prisma.project.update({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    data: { locked: true },
  });

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  revalidatePath('/chat');
  revalidatePath('/reports');
  revalidatePath('/insights');

  return { success: true, message: 'Project moved to vault' };
}

/**
 * Move a project out of the vault (set locked = false).
 * Requires vault to be unlocked (cookie check).
 */
export async function moveProjectFromVault(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' };
  }

  const unlocked = await isVaultUnlocked();
  if (!unlocked) {
    return { success: false, message: 'Vault must be unlocked to move projects out' };
  }

  await prisma.project.update({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    data: { locked: false },
  });

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  revalidatePath('/chat');
  revalidatePath('/reports');
  revalidatePath('/insights');

  return { success: true, message: 'Project moved to active' };
}

/**
 * Get all vault (locked) projects for the current user.
 * Only callable when vault is unlocked.
 */
export async function getVaultProjects(userId?: string) {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) return [];
    targetUserId = session.user.id;
  }

  const unlocked = await isVaultUnlocked();
  if (!unlocked) return [];

  const projects = await prisma.project.findMany({
    where: {
      userId: targetUserId,
      locked: true,
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { activities: true },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });

  return projects;
}

/**
 * Check if the user has a vault password set.
 */
export async function hasVaultPassword(userId?: string): Promise<boolean> {
  let targetUserId = userId;

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) return false;
    targetUserId = session.user.id;
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: targetUserId },
    select: { vaultPasswordHash: true },
  });

  return !!settings?.vaultPasswordHash;
}

/**
 * Check if vault is currently unlocked. Thin wrapper for client consumption.
 */
export async function getVaultStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { hasPassword: false, isUnlocked: false };
  }

  const [hasPassword, unlocked] = await Promise.all([
    hasVaultPassword(session.user.id),
    isVaultUnlocked(),
  ]);

  // Also get count of locked projects
  const lockedCount = await prisma.project.count({
    where: { userId: session.user.id, locked: true },
  });

  return { hasPassword, isUnlocked: unlocked, lockedCount };
}
