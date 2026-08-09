import { createHash, timingSafeEqual as _timingSafeEqual, randomBytes } from 'crypto';

export const timingSafeEqual = _timingSafeEqual;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
