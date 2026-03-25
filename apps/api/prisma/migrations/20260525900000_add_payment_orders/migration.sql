CREATE TABLE IF NOT EXISTS "payment_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "financialContextId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "exportFormat" TEXT,
    "exportedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_order_items" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "counterpartyAccount" TEXT NOT NULL,
    "counterpartyBankCode" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "variableSymbol" TEXT,
    "specificSymbol" TEXT,
    "constantSymbol" TEXT,
    "description" TEXT,
    "invoiceId" TEXT,
    "prescriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_orders_tenantId_idx" ON "payment_orders"("tenantId");
CREATE INDEX IF NOT EXISTS "payment_order_items_paymentOrderId_idx" ON "payment_order_items"("paymentOrderId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_orders_tenantId_fkey') THEN
    ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_orders_bankAccountId_fkey') THEN
    ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_orders_createdById_fkey') THEN
    ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_order_items_paymentOrderId_fkey') THEN
    ALTER TABLE "payment_order_items" ADD CONSTRAINT "payment_order_items_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "payment_orders"("id") ON DELETE CASCADE;
  END IF;
END $$;
