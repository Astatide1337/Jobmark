import { z } from 'zod';

const affirmationBlockSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.literal('affirmation'),
    config: z
      .object({
        texts: z.array(z.string().min(1).max(500)).min(1).max(20),
        totalDuration: z.number().int().min(1).max(3_600),
      })
      .strict(),
  })
  .strict();

const breathingBlockSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.literal('breathing'),
    config: z
      .object({
        pattern: z.enum(['box', '4-7-8', 'physiological-sigh', 'resonance']),
        cycles: z.number().int().min(1).max(20),
      })
      .strict(),
  })
  .strict();

const goalBlockSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.literal('goal'),
    config: z
      .object({
        goalId: z.string().min(1).max(100).optional(),
        duration: z.number().int().min(1).max(3_600),
      })
      .strict(),
  })
  .strict();

export const focusBlockSchema = z.discriminatedUnion('type', [
  affirmationBlockSchema,
  breathingBlockSchema,
  goalBlockSchema,
]);

export const focusConfigSchema = z.array(focusBlockSchema).min(1).max(30);

export type FocusConfig = z.infer<typeof focusConfigSchema>;
