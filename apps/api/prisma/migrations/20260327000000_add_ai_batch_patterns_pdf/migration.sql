-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "supplier_extraction_patterns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierIco" TEXT NOT NULL,
    "supplierName" TEXT,
    "fieldExamples" JSONB NOT NULL,
    "hints" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_extraction_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_extraction_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anthropicBatchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "ai_extraction_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_extraction_batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "fileName" TEXT,
    "pdfBase64" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "extractedData" JSONB,
    "confidence" TEXT,
    "invoiceId" TEXT,
    "errorMessage" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_extraction_batch_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_training_samples" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dokladId" TEXT,
    "pdfHash" TEXT NOT NULL,
    "imageBase64" TEXT NOT NULL,
    "extractedJson" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_training_samples_pkey" PRIMARY KEY ("id")
);

-- Add pdfBase64 to invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdfBase64" TEXT;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_extraction_patterns_tenantId_supplierIco_key" ON "supplier_extraction_patterns"("tenantId", "supplierIco");
CREATE INDEX IF NOT EXISTS "supplier_extraction_patterns_tenantId_idx" ON "supplier_extraction_patterns"("tenantId");

CREATE INDEX IF NOT EXISTS "ai_extraction_batches_tenantId_idx" ON "ai_extraction_batches"("tenantId");
CREATE INDEX IF NOT EXISTS "ai_extraction_batches_status_idx" ON "ai_extraction_batches"("status");

CREATE INDEX IF NOT EXISTS "ai_extraction_batch_items_batchId_idx" ON "ai_extraction_batch_items"("batchId");

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_training_samples_tenantId_pdfHash_key" ON "invoice_training_samples"("tenantId", "pdfHash");
CREATE INDEX IF NOT EXISTS "invoice_training_samples_tenantId_idx" ON "invoice_training_samples"("tenantId");

-- Foreign Keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "supplier_extraction_patterns" ADD CONSTRAINT "supplier_extraction_patterns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ai_extraction_batches" ADD CONSTRAINT "ai_extraction_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ai_extraction_batch_items" ADD CONSTRAINT "ai_extraction_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ai_extraction_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ai_extraction_batch_items" ADD CONSTRAINT "ai_extraction_batch_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoice_training_samples" ADD CONSTRAINT "invoice_training_samples_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
