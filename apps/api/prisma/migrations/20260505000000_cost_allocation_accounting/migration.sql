-- D1: Invoice cost allocation (doklad → složka předpisu)
CREATE TABLE IF NOT EXISTS "invoice_cost_allocations" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2),
    "vatAmount" DECIMAL(12,2),
    "unitGroupId" TEXT,
    "unitIds" TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_cost_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "invoice_cost_allocations_invoiceId_idx" ON "invoice_cost_allocations"("invoiceId");
CREATE INDEX IF NOT EXISTS "invoice_cost_allocations_componentId_idx" ON "invoice_cost_allocations"("componentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_cost_allocations_invoiceId_fkey') THEN
    ALTER TABLE "invoice_cost_allocations" ADD CONSTRAINT "invoice_cost_allocations_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_cost_allocations_componentId_fkey') THEN
    ALTER TABLE "invoice_cost_allocations" ADD CONSTRAINT "invoice_cost_allocations_componentId_fkey"
      FOREIGN KEY ("componentId") REFERENCES "prescription_components"("id") ON UPDATE CASCADE;
  END IF;
END $$;

-- D1: Accounting presets (předkontace)
CREATE TABLE IF NOT EXISTS "accounting_presets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "componentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounting_presets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "accounting_presets_tenantId_idx" ON "accounting_presets"("tenantId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounting_presets_tenantId_fkey') THEN
    ALTER TABLE "accounting_presets" ADD CONSTRAINT "accounting_presets_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
