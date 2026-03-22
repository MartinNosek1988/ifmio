-- Enhanced Payment Matching — 5 target types, partial payments, split transactions

-- MatchTarget enum
DO $$ BEGIN
  CREATE TYPE "MatchTarget" AS ENUM ('KONTO', 'INVOICE', 'COMPONENT', 'NO_EFFECT', 'UNSPECIFIED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PaymentStatus enum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- BankTransaction: new matching fields
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchTarget" "MatchTarget";
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchedEntityId" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchedEntityType" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchedAt" TIMESTAMP(3);
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchedBy" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matchNote" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "splitParentId" TEXT;

-- Self-referential FK for split transactions
ALTER TABLE "bank_transactions"
  ADD CONSTRAINT "bank_transactions_splitParentId_fkey"
  FOREIGN KEY ("splitParentId") REFERENCES "bank_transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on splitParentId
CREATE INDEX IF NOT EXISTS "bank_transactions_splitParentId_idx" ON "bank_transactions"("splitParentId");

-- Prescription: payment tracking fields
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Backfill: mark prescriptions that have matched transactions as PAID
UPDATE "prescriptions" p
SET "paymentStatus" = 'PAID',
    "paidAmount" = p."amount",
    "paidAt" = NOW()
WHERE p."status" = 'active'
  AND EXISTS (
    SELECT 1 FROM "bank_transactions" bt
    WHERE bt."prescriptionId" = p."id"
      AND bt."status" = 'matched'
  );

-- Backfill: set matchTarget = KONTO for already-matched transactions
UPDATE "bank_transactions"
SET "matchTarget" = 'KONTO',
    "matchedEntityId" = "prescriptionId",
    "matchedEntityType" = 'prescription',
    "matchedAt" = "updatedAt",
    "matchedBy" = 'auto'
WHERE "status" = 'matched'
  AND "prescriptionId" IS NOT NULL
  AND "matchTarget" IS NULL;
