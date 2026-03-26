-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paymentIban" TEXT;
