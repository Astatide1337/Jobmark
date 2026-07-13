import { afterEach, describe, expect, it } from 'vitest';
import { validateServerEnvironment } from './env';

const names = [
  'DATABASE_URL',
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
  'JOBMARK_ENCRYPTION_KEY',
] as const;
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    (process.env as Record<string, string | undefined>)[name] = original[name];
  }
});

describe('server environment validation', () => {
  it('accepts complete server configuration', () => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://localhost/jobmark',
      AUTH_GOOGLE_ID: 'google-id',
      AUTH_GOOGLE_SECRET: 'google-secret',
      AUTH_SECRET: 'auth-secret-that-is-at-least-32-characters',
    });

    expect(() => validateServerEnvironment()).not.toThrow();
  });

  it('reports missing configuration without exposing values', () => {
    for (const name of names) {
      delete (process.env as Record<string, string | undefined>)[name];
    }

    expect(() => validateServerEnvironment()).toThrow(/DATABASE_URL/);
    expect(() => validateServerEnvironment()).toThrow(/AUTH_SECRET or NEXTAUTH_SECRET/);
  });
});
