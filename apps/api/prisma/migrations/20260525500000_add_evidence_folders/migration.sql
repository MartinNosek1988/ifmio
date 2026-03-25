-- EvidenceFolder
CREATE TABLE IF NOT EXISTS "evidence_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_folders_pkey" PRIMARY KEY ("id")
);

-- EvidenceFolderAllocation
CREATE TABLE IF NOT EXISTS "evidence_folder_allocations" (
    "id" TEXT NOT NULL,
    "evidenceFolderId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "year" INTEGER,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_folder_allocations_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "evidence_folders_tenantId_propertyId_idx" ON "evidence_folders"("tenantId", "propertyId");
CREATE INDEX IF NOT EXISTS "evidence_folder_allocations_evidenceFolderId_idx" ON "evidence_folder_allocations"("evidenceFolderId");
CREATE INDEX IF NOT EXISTS "evidence_folder_allocations_invoiceId_idx" ON "evidence_folder_allocations"("invoiceId");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_folders_tenantId_fkey') THEN
    ALTER TABLE "evidence_folders" ADD CONSTRAINT "evidence_folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_folders_propertyId_fkey') THEN
    ALTER TABLE "evidence_folders" ADD CONSTRAINT "evidence_folders_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_folder_allocations_evidenceFolderId_fkey') THEN
    ALTER TABLE "evidence_folder_allocations" ADD CONSTRAINT "evidence_folder_allocations_evidenceFolderId_fkey" FOREIGN KEY ("evidenceFolderId") REFERENCES "evidence_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_folder_allocations_invoiceId_fkey') THEN
    ALTER TABLE "evidence_folder_allocations" ADD CONSTRAINT "evidence_folder_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
