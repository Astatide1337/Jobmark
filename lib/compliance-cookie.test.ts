import { beforeEach, describe, expect, it } from 'vitest';
import { createComplianceCookieValue, isValidComplianceCookieValue } from './compliance-cookie';

describe('compliance cookie', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret-that-is-at-least-32-characters';
  });

  it('signs and validates the current compliance versions', async () => {
    const value = await createComplianceCookieValue();

    expect(value).toBeTruthy();
    await expect(isValidComplianceCookieValue(value ?? undefined)).resolves.toBe(true);
  });

  it('rejects tampering, stale versions, and missing values', async () => {
    const value = await createComplianceCookieValue();
    const [, signature] = value!.split('.');

    await expect(isValidComplianceCookieValue(undefined)).resolves.toBe(false);
    await expect(isValidComplianceCookieValue(`stale.${signature}`)).resolves.toBe(false);
    await expect(isValidComplianceCookieValue(`${value}.tampered`)).resolves.toBe(false);
  });
});
