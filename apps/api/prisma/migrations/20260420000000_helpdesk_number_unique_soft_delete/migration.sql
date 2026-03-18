-- Soft delete field
ALTER TABLE "helpdesk_tickets" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Unique constraint on tenant + number
CREATE UNIQUE INDEX IF NOT EXISTS "helpdesk_tickets_tenantId_number_key" ON "helpdesk_tickets"("tenantId", "number");
