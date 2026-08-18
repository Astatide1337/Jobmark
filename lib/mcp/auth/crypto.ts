import { createHash, timingSafeEqual as _timingSafeEqual, randomBytes } from 'crypto';

export const timingSafeEqual = _timingSafeEqual;

/**
 * OAuth artifacts are generated with 256 bits of randomness, not chosen by a
 * person. A fast digest is intentional here so indexed token lookups do not
 * require a password-hash cost for values that already have high entropy.
 */
// codeql[js/insufficient-password-hash]
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** RFC 7636 requires the S256 code-challenge method to use SHA-256. */
// codeql[js/insufficient-password-hash]
export function hashPKCE(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function verifyPKCE(challenge: string, verifier: string): boolean {
  const expected = hashPKCE(verifier);
  const supplied = Buffer.from(challenge);
  const computed = Buffer.from(expected);
  return supplied.length === computed.length && timingSafeEqual(supplied, computed);
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateAuthCode(): string {
  return randomBytes(32).toString('base64url');
}

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateCodeChallenge(verifier: string): string {
  return hashPKCE(verifier);
}
