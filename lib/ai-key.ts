/**
 * AES-256-GCM Encryption for User-Supplied API Keys
 *
 * Why AUTH_SECRET: The encryption key is derived from AUTH_SECRET (the same
 * environment variable used by Auth.js and the vault feature). This avoids
 * introducing a new secret to manage — the app already can't run without
 * AUTH_SECRET, so it's a safe anchor for all symmetric encryption in the project.
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

import crypto from 'crypto';

/**
 * Derive a 32-byte AES key from AUTH_SECRET using SHA-256.
 * Mirrors the key derivation in lib/project-lock.ts for consistency.
 */
function getEncryptionKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(process.env.AUTH_SECRET ?? 'fallback-dev-secret')
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
