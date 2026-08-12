import { describe, expect, it } from 'vitest';
import {
  appearanceSettingsSchema,
  goalSettingsSchema,
  projectUpdateSchema,
} from './input-schemas';

describe('server action input allowlists', () => {
  it('rejects unrelated security fields', () => {
    expect(goalSettingsSchema.safeParse({ monthlyTarget: 5, userId: 'other-user' }).success).toBe(
      false
    );
    expect(
      appearanceSettingsSchema.safeParse({ themeMode: 'dark', vaultPasswordHash: 'x' }).success
    ).toBe(false);
  });
  it('rejects project ownership and lifecycle fields', () => {
    expect(projectUpdateSchema.safeParse({ name: 'safe', userId: 'other-user' }).success).toBe(
      false
    );
    expect(projectUpdateSchema.safeParse({ name: 'safe', locked: true }).success).toBe(false);
    expect(projectUpdateSchema.safeParse({ name: 'safe', archived: true }).success).toBe(false);
  });
});
