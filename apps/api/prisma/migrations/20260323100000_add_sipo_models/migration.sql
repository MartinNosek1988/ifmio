-- SIPO (Soustředěné inkaso plateb obyvatelstva) — Česká pošta

-- Add SIPO to LedgerSourceType
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerSourceType') THEN
    ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'SIPO';
  END IF;
END $$;

-- SIPO enums
DO $$ BEGIN CREATE TYPE "SipoDeliveryMode" AS ENUM ('FULL_REGISTER', 'CHANGES_ONLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SipoEncoding" AS ENUM ('CP852', 'WIN1250'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SipoExportStatus" AS ENUM ('GENERATED', 'SENT', 'ACCEPTED', 'REJECTED', 'PARTIALLY_OK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SipoConfig
CREATE TABLE IF NOT EXISTS "sipo_configs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "recipientNumber" VARCHAR(6) NOT NULL,
  "feeCode" VARCHAR(3) NOT NULL,
  "deliveryMode" "SipoDeliveryMode" NOT NULL DEFAULT 'FULL_REGISTER',
  "encoding" "SipoEncoding" NOT NULL DEFAULT 'WIN1250',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sipo_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sipo_configs_propertyId_key" UNIQUE ("propertyId")
);
ALTER TABLE "sipo_configs" ADD CONSTRAINT "sipo_configs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "sipo_configs_tenantId_idx" ON "sipo_configs"("tenantId");

-- SipoExport
CREATE TABLE IF NOT EXISTS "sipo_exports" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "period" VARCHAR(6) NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "fileName" TEXT NOT NULL,
  "status" "SipoExportStatus" NOT NULL DEFAULT 'GENERATED',
  "errorFile" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sipo_exports_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "sipo_exports" ADD CONSTRAINT "sipo_exports_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "sipo_exports_tenantId_idx" ON "sipo_exports"("tenantId");
CREATE INDEX IF NOT EXISTS "sipo_exports_propertyId_period_idx" ON "sipo_exports"("propertyId", "period");

-- SipoPayment
CREATE TABLE IF NOT EXISTS "sipo_payments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "period" VARCHAR(6) NOT NULL,
  "sipoNumber" VARCHAR(10) NOT NULL,
  "recipientNumber" VARCHAR(6) NOT NULL,
  "feeCode" VARCHAR(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "matchedToKonto" BOOLEAN NOT NULL DEFAULT false,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sipo_payments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "sipo_payments" ADD CONSTRAINT "sipo_payments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "sipo_payments_tenantId_idx" ON "sipo_payments"("tenantId");
CREATE INDEX IF NOT EXISTS "sipo_payments_sipoNumber_period_idx" ON "sipo_payments"("sipoNumber", "period");

-- Add sipoNumber to Occupancy
ALTER TABLE "occupancies" ADD COLUMN IF NOT EXISTS "sipoNumber" VARCHAR(10);
