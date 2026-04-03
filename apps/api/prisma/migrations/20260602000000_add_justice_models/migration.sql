-- Add JUSTICE_SBIRKA to KbDataSource enum
ALTER TYPE "KbDataSource" ADD VALUE IF NOT EXISTS 'JUSTICE_SBIRKA';

-- Registry changes (OR zápisy/změny/výmazy)
CREATE TABLE "kb_registry_changes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3),
    "changeType" TEXT NOT NULL,
    "section" TEXT,
    "fileNumber" TEXT,
    "description" TEXT,
    "rawData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_registry_changes_pkey" PRIMARY KEY ("id")
);

-- Sbírka listin documents
CREATE TABLE "kb_sbirka_listin" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "filingDate" TIMESTAMP(3),
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "justiceDocId" TEXT,
    "downloadUrl" TEXT,
    "extractedData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_sbirka_listin_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "kb_registry_changes_organizationId_idx" ON "kb_registry_changes"("organizationId");
CREATE INDEX "kb_registry_changes_changeDate_idx" ON "kb_registry_changes"("changeDate");
CREATE INDEX "kb_sbirka_listin_organizationId_idx" ON "kb_sbirka_listin"("organizationId");
CREATE INDEX "kb_sbirka_listin_documentType_idx" ON "kb_sbirka_listin"("documentType");

-- Foreign keys
ALTER TABLE "kb_registry_changes" ADD CONSTRAINT "kb_registry_changes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kb_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_sbirka_listin" ADD CONSTRAINT "kb_sbirka_listin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kb_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
