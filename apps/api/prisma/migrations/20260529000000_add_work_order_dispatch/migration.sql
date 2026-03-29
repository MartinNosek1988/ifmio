-- AlterTable: WorkOrder dispatch fields
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "dispatchedById" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierNote" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierConfirmedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierEta" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierDeclinedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "supplierDeclineReason" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "completedPhotos" JSONB;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "completionNote" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "csatScore" INTEGER;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "csatComment" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
