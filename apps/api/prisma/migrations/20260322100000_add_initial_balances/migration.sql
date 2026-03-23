-- Initial Balances (Počáteční stavy) — tracking model for SVJ migration

-- InitialBalanceType enum
DO $$ BEGIN
  CREATE TYPE "InitialBalanceType" AS ENUM (
    'OWNER_DEBT', 'OWNER_OVERPAYMENT', 'BANK_ACCOUNT',
    'FUND_BALANCE', 'DEPOSIT', 'METER_READING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- InitialBalance table
CREATE TABLE IF NOT EXISTS "initial_balances" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "type" "InitialBalanceType" NOT NULL,
  "entityId" TEXT,
  "entityType" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "meterValue" DECIMAL(12,3),
  "cutoverDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "initial_balances_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one entry per tenant+property+type+entity
ALTER TABLE "initial_balances"
  ADD CONSTRAINT "initial_balances_tenantId_propertyId_type_entityId_key"
  UNIQUE ("tenantId", "propertyId", "type", "entityId");

-- Foreign key to properties
ALTER TABLE "initial_balances"
  ADD CONSTRAINT "initial_balances_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "initial_balances_tenantId_propertyId_idx"
  ON "initial_balances"("tenantId", "propertyId");
CREATE INDEX IF NOT EXISTS "initial_balances_tenantId_type_idx"
  ON "initial_balances"("tenantId", "type");
