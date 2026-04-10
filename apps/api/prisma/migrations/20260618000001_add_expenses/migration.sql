-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('material', 'fuel', 'transport', 'tools', 'services', 'accommodation', 'food', 'other');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'reimbursed');

-- CreateEnum
CREATE TYPE "ReimbursementType" AS ENUM ('cash', 'bank_transfer', 'company_card');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "workOrderId" TEXT,
    "number" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedByName" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "vendorIco" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2),
    "vatAmount" DECIMAL(12,2),
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "receiptNumber" TEXT,
    "imageBase64" TEXT,
    "mimeType" TEXT,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "aiRawResponse" JSONB,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "reimbursementType" "ReimbursementType" NOT NULL DEFAULT 'cash',
    "reimbursedAt" TIMESTAMP(3),
    "reimbursedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenantId_number_key" ON "expenses"("tenantId", "number");

-- CreateIndex
CREATE INDEX "expenses_tenantId_idx" ON "expenses"("tenantId");

-- CreateIndex
CREATE INDEX "expenses_submittedBy_idx" ON "expenses"("submittedBy");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_propertyId_idx" ON "expenses"("propertyId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: Tenant isolation policy
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "expenses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));
