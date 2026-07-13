import { z } from 'zod';

export const aiSettingsSchema = z
  .object({ aiProvider: z.string().optional(), aiModel: z.string().max(120).nullable().optional() })
  .strict();
export const goalSettingsSchema = z
  .object({
    primaryGoal: z.string().max(500).optional(),
    goalDeadline: z.date().nullable().optional(),
    whyStatement: z.string().max(500).optional(),
    dailyTarget: z.number().int().min(0).max(10_000).optional(),
    weeklyTarget: z.number().int().min(0).max(10_000).optional(),
    monthlyTarget: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
export const appearanceSettingsSchema = z
  .object({
    themePreset: z.string().max(50).optional(),
    themeMode: z.enum(['light', 'dark', 'system']).optional(),
    hideArchived: z.boolean().optional(),
    showConfetti: z.boolean().optional(),
    timeZone: z.string().max(100).optional(),
  })
  .strict();
export const projectUpdateSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    description: z.string().max(200).nullable().optional(),
  })
  .strict();
