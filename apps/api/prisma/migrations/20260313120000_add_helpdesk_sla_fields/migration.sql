-- AlterTable
ALTER TABLE "helpdesk_tickets" ADD COLUMN "responseDueAt" TIMESTAMP(3),
ADD COLUMN "resolutionDueAt" TIMESTAMP(3),
ADD COLUMN "firstResponseAt" TIMESTAMP(3),
ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "escalatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "helpdesk_tickets_tenantId_resolutionDueAt_idx" ON "helpdesk_tickets"("tenantId", "resolutionDueAt");
