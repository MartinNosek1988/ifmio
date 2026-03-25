-- Invoice: add constantSymbol, specificSymbol, allocationStatus
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "constantSymbol" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "specificSymbol" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "allocationStatus" TEXT NOT NULL DEFAULT 'unallocated';

-- InvoiceCostAllocation: add period, consumption, target fields
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "year" INTEGER;
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "periodFrom" TIMESTAMP(3);
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "periodTo" TIMESTAMP(3);
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "consumption" DECIMAL(12,4);
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "consumptionUnit" TEXT;
ALTER TABLE "invoice_cost_allocations" ADD COLUMN IF NOT EXISTS "targetOwnerId" TEXT;
