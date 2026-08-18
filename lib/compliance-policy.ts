import { z } from 'zod';

/**
 * Why: Legal documents must be versioned in application code so an acceptance
 * can be tied to the exact text shown to a user at the time of acceptance.
 * These versions identify the self-authored release drafts currently shown by
 * the public Terms and Privacy routes.
 */
export const COMPLIANCE_DOCUMENT_VERSIONS = {
  terms: '2026-08-18',
  privacy: '2026-08-18',
} as const;

export const COMPLIANCE_MINIMUM_AGE = 16;

export const complianceAcceptanceInputSchema = z
  .object({
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
    age16Confirmed: z.literal(true),
  })
  .strict();

export type ComplianceAcceptanceInput = z.infer<typeof complianceAcceptanceInputSchema>;

export type ComplianceStatus = {
  terms: {
    version: string;
    acceptedAt: string | null;
  };
  privacy: {
    version: string;
    acceptedAt: string | null;
  };
  age16ConfirmedAt: string | null;
  isComplete: boolean;
};
