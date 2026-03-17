-- DropForeignKey (old SetNull)
ALTER TABLE "bank_accounts" DROP CONSTRAINT IF EXISTS "bank_accounts_financialContextId_fkey";

-- AlterColumn: make NOT NULL
ALTER TABLE "bank_accounts" ALTER COLUMN "financialContextId" SET NOT NULL;

-- AddForeignKey (new Restrict)
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
