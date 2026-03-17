-- Settlement status enum
DO $$ BEGIN
  CREATE TYPE "SettlementStatus" AS ENUM ('draft', 'calculated', 'approved', 'sent', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SettlementCostType" AS ENUM ('heating', 'hot_water', 'cold_water', 'sewage', 'elevator', 'cleaning', 'lighting', 'waste', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DistributionKey" AS ENUM ('heated_area', 'floor_area', 'person_count', 'meter_reading', 'ownership_share', 'equal', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Settlement table
CREATE TABLE IF NOT EXISTS "settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "financialContextId" TEXT NOT NULL,
    "billingPeriodId" TEXT,
    "name" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'draft',
    "totalHeatingCost" DECIMAL(12,2),
    "totalHotWaterCost" DECIMAL(12,2),
    "heatingBasicPercent" INTEGER NOT NULL DEFAULT 50,
    "hotWaterBasicPercent" INTEGER NOT NULL DEFAULT 30,
    "buildingEnergyClass" VARCHAR(2),
    "totalHeatedArea" DECIMAL(10,2),
    "calculatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- Settlement costs table
CREATE TABLE IF NOT EXISTS "settlement_costs" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "costType" "SettlementCostType" NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "invoiceId" TEXT,
    "distributionKey" "DistributionKey" NOT NULL,
    "basicPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_costs_pkey" PRIMARY KEY ("id")
);

-- Settlement items table
CREATE TABLE IF NOT EXISTS "settlement_items" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "heatingBasic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "heatingConsumption" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "heatingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "heatingCorrected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hotWaterBasic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hotWaterConsumption" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hotWaterTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherCosts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAdvances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "heatedArea" DECIMAL(10,2),
    "personCount" INTEGER,
    "meterReading" DECIMAL(12,3),
    "waterReading" DECIMAL(12,3),
    "costBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "settlements_tenantId_propertyId_idx" ON "settlements"("tenantId", "propertyId");
CREATE INDEX IF NOT EXISTS "settlements_tenantId_status_idx" ON "settlements"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "settlement_costs_settlementId_idx" ON "settlement_costs"("settlementId");
CREATE INDEX IF NOT EXISTS "settlement_items_settlementId_idx" ON "settlement_items"("settlementId");
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_items_settlementId_unitId_key" ON "settlement_items"("settlementId", "unitId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_billingPeriodId_fkey" FOREIGN KEY ("billingPeriodId") REFERENCES "billing_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlement_costs" ADD CONSTRAINT "settlement_costs_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
