-- Why: Keep legal acceptance auditable by storing immutable document/version
-- records separately from the current age-eligibility confirmation timestamp.
CREATE TYPE "ComplianceDocumentType" AS ENUM ('TERMS', 'PRIVACY');

CREATE TABLE "UserCompliance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age16ConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompliance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceAcceptance" (
    "id" TEXT NOT NULL,
    "complianceId" TEXT NOT NULL,
    "documentType" "ComplianceDocumentType" NOT NULL,
    "documentVersion" VARCHAR(50) NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCompliance_userId_key" ON "UserCompliance"("userId");
CREATE UNIQUE INDEX "ComplianceAcceptance_complianceId_documentType_documentVersion_key"
    ON "ComplianceAcceptance"("complianceId", "documentType", "documentVersion");
CREATE INDEX "ComplianceAcceptance_complianceId_documentType_acceptedAt_idx"
    ON "ComplianceAcceptance"("complianceId", "documentType", "acceptedAt" DESC);

ALTER TABLE "UserCompliance"
    ADD CONSTRAINT "UserCompliance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceAcceptance"
    ADD CONSTRAINT "ComplianceAcceptance_complianceId_fkey"
    FOREIGN KEY ("complianceId") REFERENCES "UserCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
