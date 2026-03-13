-- CreateEnum
CREATE TYPE "InvoiceApprovalStatus" AS ENUM ('draft', 'submitted', 'approved');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "approvalStatus" "InvoiceApprovalStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "submittedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedById" TEXT,
ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "invoices_tenantId_approvalStatus_idx" ON "invoices"("tenantId", "approvalStatus");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
