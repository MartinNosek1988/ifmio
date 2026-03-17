-- Banking API fields on BankAccount
ALTER TABLE "bank_accounts" ADD COLUMN "bankProvider" VARCHAR(20);
ALTER TABLE "bank_accounts" ADD COLUMN "apiToken" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN "apiTokenLastFour" VARCHAR(4);
ALTER TABLE "bank_accounts" ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bank_accounts" ADD COLUMN "syncIntervalMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "bank_accounts" ADD COLUMN "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "bank_accounts" ADD COLUMN "lastSyncCursor" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN "syncStatus" VARCHAR(20);
ALTER TABLE "bank_accounts" ADD COLUMN "syncStatusMessage" TEXT;

-- Resident → Party link
ALTER TABLE "residents" ADD COLUMN "partyId" TEXT;
CREATE INDEX "residents_partyId_idx" ON "residents"("partyId");
ALTER TABLE "residents" ADD CONSTRAINT "residents_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
