-- FK onDelete audit: make all 32 FK onDelete declarations explicit in schema.
-- Only BankAccount→Property actually changes at DB level (SetNull → Restrict).
-- All other relations already had the correct DB-level behavior by Prisma default.

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_propertyId_fkey";

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
