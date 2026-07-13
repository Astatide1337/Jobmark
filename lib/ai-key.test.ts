import { afterEach, describe, expect, it } from 'vitest';
import { decryptApiKey, encryptApiKey } from './ai-key';

const originalSecret = process.env.JOBMARK_ENCRYPTION_KEY;
const originalAuthSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.JOBMARK_ENCRYPTION_KEY = originalSecret;
  env.AUTH_SECRET = originalAuthSecret;
  env.NEXTAUTH_SECRET = originalNextAuthSecret;
  env.NODE_ENV = originalNodeEnv;
});

describe('API-key encryption', () => {
  it('round-trips with the dedicated encryption secret', () => {
    env.NODE_ENV = 'test';
    env.JOBMARK_ENCRYPTION_KEY = 'test-encryption-secret';
    env.AUTH_SECRET = 'different-auth-secret';
    env.NEXTAUTH_SECRET = '';

    const ciphertext = encryptApiKey('provider-key');

    expect(ciphertext).not.toContain('provider-key');
    expect(decryptApiKey(ciphertext)).toBe('provider-key');
  });

  it('rejects tampered ciphertext and a different secret', () => {
    env.NODE_ENV = 'test';
    env.JOBMARK_ENCRYPTION_KEY = 'test-encryption-secret';
    const ciphertext = encryptApiKey('provider-key');

    expect(decryptApiKey(`${ciphertext}tampered`)).toBeNull();

    env.JOBMARK_ENCRYPTION_KEY = 'another-secret';
    expect(decryptApiKey(ciphertext)).toBeNull();
  });

  it('fails closed in production when no encryption secret is configured', () => {
    env.NODE_ENV = 'production';
    env.JOBMARK_ENCRYPTION_KEY = '';
    env.AUTH_SECRET = '';
    env.NEXTAUTH_SECRET = '';

    expect(() => encryptApiKey('provider-key')).toThrow(/required in production/i);
  });
});
