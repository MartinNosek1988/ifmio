-- AlterTable: Add operational fields to helpdesk_tickets
ALTER TABLE "helpdesk_tickets" ADD COLUMN "assetId" TEXT;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "requesterUserId" TEXT;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "dispatcherUserId" TEXT;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "deadlineManuallySet" BOOLEAN NOT NULL DEFAULT false;

-- Foreign Keys
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_requesterUserId_fkey"
  FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_dispatcherUserId_fkey"
  FOREIGN KEY ("dispatcherUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for asset link
CREATE INDEX "helpdesk_tickets_assetId_idx" ON "helpdesk_tickets"("assetId");
