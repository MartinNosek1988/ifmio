-- Banking API fields on BankAccount
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "bankProvider" VARCHAR(20);
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "apiToken" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "apiTokenLastFour" VARCHAR(4);
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "syncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "syncIntervalMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "lastSyncCursor" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "syncStatus" VARCHAR(20);
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "syncStatusMessage" TEXT;

-- Resident → Party link
ALTER TABLE "residents" ADD COLUMN IF NOT EXISTS "partyId" TEXT;
CREATE INDEX IF NOT EXISTS "residents_partyId_idx" ON "residents"("partyId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'residents_partyId_fkey') THEN
    ALTER TABLE "residents" ADD CONSTRAINT "residents_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
