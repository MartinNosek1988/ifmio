-- Wave 1: Owner Account + Ledger Entry

CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT', 'ADJUSTMENT');
CREATE TYPE "LedgerSourceType" AS ENUM ('PRESCRIPTION', 'BANK_TRANSACTION', 'CREDIT_APPLICATION', 'LATE_FEE', 'MANUAL_ADJUSTMENT');

CREATE TABLE "owner_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastPostingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "owner_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "owner_accounts_tenantId_unitId_residentId_key" ON "owner_accounts"("tenantId", "unitId", "residentId");
CREATE INDEX "owner_accounts_tenantId_propertyId_idx" ON "owner_accounts"("tenantId", "propertyId");

ALTER TABLE "owner_accounts" ADD CONSTRAINT "owner_accounts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_accounts" ADD CONSTRAINT "owner_accounts_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_accounts" ADD CONSTRAINT "owner_accounts_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "description" TEXT,
    "postingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ledger_entries_accountId_postingDate_idx" ON "ledger_entries"("accountId", "postingDate");
CREATE INDEX "ledger_entries_sourceType_sourceId_idx" ON "ledger_entries"("sourceType", "sourceId");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "owner_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add ledgerEntryId to prescriptions and bank_transactions
ALTER TABLE "prescriptions" ADD COLUMN "ledgerEntryId" TEXT;
CREATE UNIQUE INDEX "prescriptions_ledgerEntryId_key" ON "prescriptions"("ledgerEntryId");

ALTER TABLE "bank_transactions" ADD COLUMN "ledgerEntryId" TEXT;
CREATE UNIQUE INDEX "bank_transactions_ledgerEntryId_key" ON "bank_transactions"("ledgerEntryId");
