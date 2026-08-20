import { randomBytes } from 'crypto';
import * as jose from 'jose';
import type { JWKS } from './types';

const JWKS_ROTATION_INTERVAL = 24 * 60 * 60 * 1000;
const JWKS_RETENTION = 48 * 60 * 60 * 1000;

let currentKeyPair: jose.GenerateKeyPairResult | null = null;
let previousKeyPair: jose.GenerateKeyPairResult | null = null;
let currentKid: string;
let previousKid: string | null = null;

async function generateKeyPair(): Promise<jose.GenerateKeyPairResult> {
  return jose.generateKeyPair('RS256', { extractable: true });
}

async function rotateKeys() {
  previousKeyPair = currentKeyPair;
  previousKid = currentKid;
  currentKeyPair = await generateKeyPair();
  currentKid = randomBytes(16).toString('hex');

  setTimeout(() => {
    if (previousKeyPair) {
      previousKeyPair = null;
      previousKid = null;
    }
  }, JWKS_RETENTION);
}

async function getVerificationKeys(): Promise<Map<string, CryptoKey>> {
  const keys = new Map<string, CryptoKey>();
  if (!currentKeyPair) {
    currentKeyPair = await generateKeyPair();
    currentKid = randomBytes(16).toString('hex');
  }

  keys.set(currentKid, currentKeyPair.publicKey);
  if (previousKeyPair && previousKid) {
    keys.set(previousKid, previousKeyPair.publicKey);
  }
  return keys;
}

/** Start the optional 24-hour key-rotation schedule for a long-lived runtime. */
export async function initializeOAuth(): Promise<void> {
  await rotateKeys();
  setInterval(rotateKeys, JWKS_ROTATION_INTERVAL);
}

export async function getJWKSKeys(): Promise<JWKS> {
  const keys = await getVerificationKeys();
  const jwksKeys = [];

  for (const [kid, publicKey] of keys) {
    const jwk = await jose.exportJWK(publicKey);
    jwksKeys.push({
      kty: 'RSA' as const,
      use: 'sig' as const,
      kid,
      n: jwk.n!,
      e: jwk.e!,
      alg: 'RS256' as const,
    });
  }

  return { keys: jwksKeys };
}
