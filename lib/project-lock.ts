/**
 * Vault (Password-Locked Projects) Utilities
 *
 * Why: Users need to hide sensitive projects behind a password.
 * This module provides cookie management for vault unlock state and
 * a query helper that every server action calls to determine which
 * project IDs should be excluded from results.
 *
 * Security Model:
 * - Vault unlock state is stored in an encrypted, HTTP-only, session-scoped cookie.
 * - The cookie value is encrypted with AES-256-GCM using a key derived from AUTH_SECRET.
 * - Closing the browser clears the session cookie, re-locking the vault.
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const COOKIE_NAME = 'jm_vault_unlocked';

/**
 * Derive a 32-byte AES key from AUTH_SECRET using SHA-256.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 */
function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
function decrypt(ciphertext: string): string | null {
  try {
    const key = getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) return null;

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Check if the vault is currently unlocked for the current request.
 * Reads and decrypts the session cookie.
 */
export async function isVaultUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return false;

  const decrypted = decrypt(cookie.value);
  return decrypted === 'unlocked';
}

/**
 * Set or clear the vault unlock cookie.
 * When `unlocked` is true, sets an encrypted session cookie.
 * When false, deletes the cookie.
 */
export async function setVaultUnlocked(unlocked: boolean): Promise<void> {
  const cookieStore = await cookies();

  if (unlocked) {
    const encryptedValue = encrypt('unlocked');
    cookieStore.set(COOKIE_NAME, encryptedValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // No maxAge = session cookie (cleared when browser closes)
    });
  } else {
    cookieStore.delete(COOKIE_NAME);
  }
}

/**
 * Get the IDs of all locked projects for a user.
 *
 * If the vault is currently unlocked (cookie present), returns an empty array
 * (nothing is hidden). If the vault is locked, returns all locked project IDs.
 *
 * This is the single primitive every server action calls to filter results.
 */
export async function getLockedProjectIds(userId: string): Promise<string[]> {
  const unlocked = await isVaultUnlocked();
  if (unlocked) return [];

  const lockedProjects = await prisma.project.findMany({
    where: {
      userId,
      locked: true,
    },
    select: { id: true },
  });

  return lockedProjects.map(p => p.id);
}

/**
 * Build a Prisma `where` fragment that excludes activities belonging to locked projects.
 * Activities without a project are always included. Returns `{}` when nothing is locked.
 */
export function buildLockedActivityFilter(lockedIds: string[]): Record<string, unknown> {
  if (lockedIds.length === 0) return {};
  return { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] };
}

/**
 * Post-filter reports whose JSON metadata references a locked project.
 * Used because Prisma JSON path filters are unwieldy for this access pattern.
 */
export function filterLockedReports<T extends { metadata: unknown }>(
  reports: T[],
  lockedIds: string[]
): T[] {
  if (lockedIds.length === 0) return reports;
  return reports.filter(report => {
    const metadata = report.metadata as Record<string, unknown> | null;
    const projectId = metadata?.projectId as string | null | undefined;
    return !projectId || !lockedIds.includes(projectId);
  });
}
