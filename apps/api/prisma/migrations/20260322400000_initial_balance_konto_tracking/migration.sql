-- Add konto posting tracking fields to InitialBalance
ALTER TABLE "initial_balances" ADD COLUMN IF NOT EXISTS "postedToKonto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "initial_balances" ADD COLUMN IF NOT EXISTS "ledgerEntryId" TEXT;
