import { describe, expect, it } from 'vitest';
import {
  COMPLIANCE_DOCUMENT_VERSIONS,
  COMPLIANCE_MINIMUM_AGE,
  complianceAcceptanceInputSchema,
} from './compliance-policy';

describe('compliance policy', () => {
  it('requires both document acceptances and the age eligibility confirmation', () => {
    expect(
      complianceAcceptanceInputSchema.safeParse({
        termsAccepted: true,
        privacyAccepted: true,
        age16Confirmed: true,
      }).success
    ).toBe(true);

    expect(
      complianceAcceptanceInputSchema.safeParse({
        termsAccepted: true,
        privacyAccepted: true,
        age16Confirmed: false,
      }).success
    ).toBe(false);
  });

  it('does not model a birth date as part of eligibility', () => {
    expect(COMPLIANCE_MINIMUM_AGE).toBe(16);
    expect(COMPLIANCE_DOCUMENT_VERSIONS).toEqual({ terms: '2026-03-31', privacy: '2026-03-31' });
    expect(
      complianceAcceptanceInputSchema.safeParse({
        termsAccepted: true,
        privacyAccepted: true,
        age16Confirmed: true,
        birthDate: '2010-01-01',
      }).success
    ).toBe(false);
  });
});
