-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('OPERATING', 'REPAIR_FUND', 'SAVINGS', 'OTHER');

-- AlterEnum
ALTER TYPE "BankTransactionStatus" ADD VALUE 'ignored';

-- AlterTable: BankAccount
ALTER TABLE "bank_accounts" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bank_accounts" ADD COLUMN "accountType" "BankAccountType";

-- AlterTable: BankTransaction
ALTER TABLE "bank_transactions" ADD COLUMN "bookingDate" TIMESTAMP(3);
ALTER TABLE "bank_transactions" ADD COLUMN "counterpartyAccount" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "counterpartyBankCode" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "messageForRecipient" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "externalId" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "importSource" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "rawData" JSONB;

-- CreateIndex (unique constraint for API deduplication — nullable safe)
CREATE UNIQUE INDEX "bank_transactions_bankAccountId_externalId_key" ON "bank_transactions"("bankAccountId", "externalId");
