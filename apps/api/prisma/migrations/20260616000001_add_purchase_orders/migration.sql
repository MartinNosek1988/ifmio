-- CreateEnum
CREATE TYPE "POSourceType" AS ENUM ('work_order', 'helpdesk', 'manual');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "POMatchStatus" AS ENUM ('unmatched', 'partial', 'matched');

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "financialContextId" TEXT,
    "number" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierIco" TEXT,
    "supplierEmail" TEXT,
    "sourceType" "POSourceType",
    "sourceId" TEXT,
    "description" TEXT,
    "deliveryAddress" TEXT,
    "amountBase" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2),
    "vatAmount" DECIMAL(12,2),
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "status" "POStatus" NOT NULL DEFAULT 'draft',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "matchStatus" "POMatchStatus" NOT NULL DEFAULT 'unmatched',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "catalogCode" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add purchaseOrderId to invoices
ALTER TABLE "invoices" ADD COLUMN "purchaseOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenantId_number_key" ON "purchase_orders"("tenantId", "number");
CREATE INDEX "purchase_orders_tenantId_idx" ON "purchase_orders"("tenantId");
CREATE INDEX "purchase_orders_tenantId_status_idx" ON "purchase_orders"("tenantId", "status");
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");
CREATE INDEX "invoices_purchaseOrderId_idx" ON "invoices"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: tenant isolation
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_purchase_orders" ON "purchase_orders"
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_purchase_order_items" ON "purchase_order_items"
    USING (
        EXISTS (
            SELECT 1 FROM "purchase_orders" po
            WHERE po."id" = "purchase_order_items"."purchaseOrderId"
              AND po."tenantId" = current_setting('app.current_tenant_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "purchase_orders" po
            WHERE po."id" = "purchase_order_items"."purchaseOrderId"
              AND po."tenantId" = current_setting('app.current_tenant_id', true)
        )
    );
