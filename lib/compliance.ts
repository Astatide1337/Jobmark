import { ComplianceDocumentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { COMPLIANCE_DOCUMENT_VERSIONS, type ComplianceStatus } from '@/lib/compliance-policy';

/**
 * Why: This query only treats the currently published versions as accepted.
 * Older records remain available for audit and automatically require a new
 * acceptance when a document version changes.
 */
export async function getComplianceStatus(userId: string): Promise<ComplianceStatus> {
  const compliance = await prisma.userCompliance.findUnique({
    where: { userId },
    select: {
      age16ConfirmedAt: true,
      acceptances: {
        where: {
          OR: [
            {
              documentType: ComplianceDocumentType.TERMS,
              documentVersion: COMPLIANCE_DOCUMENT_VERSIONS.terms,
            },
            {
              documentType: ComplianceDocumentType.PRIVACY,
              documentVersion: COMPLIANCE_DOCUMENT_VERSIONS.privacy,
            },
          ],
        },
        select: {
          documentType: true,
          acceptedAt: true,
        },
      },
    },
  });

  const termsAcceptance = compliance?.acceptances.find(
    acceptance => acceptance.documentType === ComplianceDocumentType.TERMS
  );
  const privacyAcceptance = compliance?.acceptances.find(
    acceptance => acceptance.documentType === ComplianceDocumentType.PRIVACY
  );
  const age16ConfirmedAt = compliance?.age16ConfirmedAt?.toISOString() ?? null;
  const termsAcceptedAt = termsAcceptance?.acceptedAt.toISOString() ?? null;
  const privacyAcceptedAt = privacyAcceptance?.acceptedAt.toISOString() ?? null;

  return {
    terms: {
      version: COMPLIANCE_DOCUMENT_VERSIONS.terms,
      acceptedAt: termsAcceptedAt,
    },
    privacy: {
      version: COMPLIANCE_DOCUMENT_VERSIONS.privacy,
      acceptedAt: privacyAcceptedAt,
    },
    age16ConfirmedAt,
    isComplete: Boolean(termsAcceptedAt && privacyAcceptedAt && age16ConfirmedAt),
  };
}

/**
 * Why: Acceptance writes are append-only per document version. This preserves
 * the timestamp for each version while keeping the age check as a timestamp,
 * not a birth date or inferred age.
 */
export async function recordCurrentComplianceAcceptance(userId: string): Promise<void> {
  const acceptedAt = new Date();

  await prisma.$transaction(async transaction => {
    const compliance = await transaction.userCompliance.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        age16ConfirmedAt: acceptedAt,
      },
      select: { id: true, age16ConfirmedAt: true },
    });

    if (!compliance.age16ConfirmedAt) {
      await transaction.userCompliance.updateMany({
        where: { id: compliance.id, age16ConfirmedAt: null },
        data: { age16ConfirmedAt: acceptedAt },
      });
    }

    await transaction.complianceAcceptance.createMany({
      data: [
        {
          complianceId: compliance.id,
          documentType: ComplianceDocumentType.TERMS,
          documentVersion: COMPLIANCE_DOCUMENT_VERSIONS.terms,
          acceptedAt,
        },
        {
          complianceId: compliance.id,
          documentType: ComplianceDocumentType.PRIVACY,
          documentVersion: COMPLIANCE_DOCUMENT_VERSIONS.privacy,
          acceptedAt,
        },
      ],
      skipDuplicates: true,
    });
  });
}
