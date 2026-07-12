/**
 * AES-256-GCM Encryption for User-Supplied API Keys
 *
 * The key uses the dedicated encryption secret when configured, then the
 * Auth.js secret for backwards-compatible decryption of existing values.
 *
 * Stored ciphertext format: `iv:authTag:ciphertext`
 * - All three components are base64-encoded and joined by colons.
 * - `iv` is a 12-byte random nonce (new nonce per encryption call).
 * - `authTag` is the 16-byte GCM authentication tag (ensures integrity).
 * - `ciphertext` is the AES-256-GCM encrypted payload.
 *
 * Why `decryptApiKey` returns null on failure: Any corrupted data, tampered
 * ciphertext, or mismatched key causes `decipher.final()` to throw. We catch
 * all errors and return null so callers can safely fall back to the server's
 * `GEMINI_API_KEY` environment variable without crashing the request.
 */

import 'server-only';
import crypto from 'crypto';

/**
 * Derive a 32-byte AES key from the configured application secret using SHA-256.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.JOBMARK_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JOBMARK_ENCRYPTION_KEY or AUTH_SECRET is required in production');
  }
  return crypto
    .createHash('sha256')
    .update(secret || 'development-only-fallback-secret')
    .digest();
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 *
 * @param plaintext - The raw API key string to encrypt.
 * @returns A colon-separated string `iv:authTag:ciphertext` (all base64-encoded).
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted API key.
 *
 * @param ciphertext - A string in `iv:authTag:ciphertext` format (all base64-encoded).
 * @returns The original plaintext API key, or `null` if decryption fails for any reason
 *   (corrupted data, wrong key, malformed format). Callers should treat null as a signal
 *   to fall back to the server-level `GEMINI_API_KEY` environment variable.
 */
export function decryptApiKey(ciphertext: string): string | null {
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
