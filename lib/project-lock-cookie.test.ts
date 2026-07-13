import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { cookiesMock, settingsMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  settingsMock: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: cookiesMock }));
vi.mock('@/lib/db', () => ({ prisma: { userSettings: { findUnique: settingsMock } } }));

import { isVaultUnlocked, setVaultUnlocked } from './project-lock';

const env = process.env as Record<string, string | undefined>;
let cookieStore: {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  env.NODE_ENV = 'test';
  env.JOBMARK_ENCRYPTION_KEY = 'vault-test-secret';
  settingsMock.mockResolvedValue({ vaultVersion: 1 });
  cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  cookiesMock.mockResolvedValue(cookieStore);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('vault unlock cookie authorization', () => {
  it('accepts the current user and rejects another user', async () => {
    await setVaultUnlocked(true, 'user-a');
    const encryptedValue = cookieStore.set.mock.calls[0][1];
    cookieStore.get.mockReturnValue({ value: encryptedValue });

    await expect(isVaultUnlocked('user-a')).resolves.toBe(true);
    await expect(isVaultUnlocked('user-b')).resolves.toBe(false);
  });

  it('invalidates a token when the vault version changes', async () => {
    await setVaultUnlocked(true, 'user-a');
    cookieStore.get.mockReturnValue({ value: cookieStore.set.mock.calls[0][1] });
    settingsMock.mockResolvedValue({ vaultVersion: 2 });

    await expect(isVaultUnlocked('user-a')).resolves.toBe(false);
  });

  it('treats malformed and expired cookies as locked', async () => {
    cookieStore.get.mockReturnValue({ value: 'not-a-valid-ciphertext' });
    await expect(isVaultUnlocked('user-a')).resolves.toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    await setVaultUnlocked(true, 'user-a');
    cookieStore.get.mockReturnValue({ value: cookieStore.set.mock.calls[0][1] });
    vi.setSystemTime(new Date('2026-01-02T00:00:01.000Z'));

    await expect(isVaultUnlocked('user-a')).resolves.toBe(false);
  });
});
