-- Field Service columns on work_orders
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "scheduledTimeFrom" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "scheduledTimeTo" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "gpsStartLat" DOUBLE PRECISION;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "gpsStartLng" DOUBLE PRECISION;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "gpsEndLat" DOUBLE PRECISION;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "gpsEndLng" DOUBLE PRECISION;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "departedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "travelTimeMinutes" INTEGER;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "checklistJson" JSONB;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "signatureBase64" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "signedByName" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "technicianNote" TEXT;

-- Index for technician daily schedule lookup
CREATE INDEX IF NOT EXISTS "work_orders_tenantId_assigneeUserId_scheduledDate_idx"
  ON "work_orders"("tenantId", "assigneeUserId", "scheduledDate");

-- WorkOrderMaterial table
CREATE TABLE IF NOT EXISTS "work_order_materials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "catalogCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_order_materials_workOrderId_idx" ON "work_order_materials"("workOrderId");
CREATE INDEX IF NOT EXISTS "work_order_materials_tenantId_idx" ON "work_order_materials"("tenantId");

ALTER TABLE "work_order_materials" ADD CONSTRAINT "work_order_materials_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for work_order_materials
ALTER TABLE "work_order_materials" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'work_order_materials') THEN
    CREATE POLICY "tenant_isolation" ON "work_order_materials"
      USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
END $$;
