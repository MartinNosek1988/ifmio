-- AlterEnum: add OPENING_BALANCE + SETTLEMENT to LedgerSourceType
ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';
ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'SETTLEMENT';

-- AlterTable: OwnerAccount — opening balance fields
ALTER TABLE "owner_accounts" ADD COLUMN "openingBalanceSet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "owner_accounts" ADD COLUMN "openingBalanceDate" TIMESTAMP(3);

-- AlterTable: MeterReading — initial reading flag
ALTER TABLE "meter_readings" ADD COLUMN "isInitial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Property — cutover date
ALTER TABLE "properties" ADD COLUMN "cutoverDate" TIMESTAMP(3);
