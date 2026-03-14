-- AlterTable: Add operational fields to work_orders
ALTER TABLE "work_orders" ADD COLUMN "assetId" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "helpdeskTicketId" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "assigneeUserId" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "requesterUserId" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "dispatcherUserId" TEXT;

-- Foreign Keys
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_helpdeskTicketId_fkey"
  FOREIGN KEY ("helpdeskTicketId") REFERENCES "helpdesk_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigneeUserId_fkey"
  FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_requesterUserId_fkey"
  FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_dispatcherUserId_fkey"
  FOREIGN KEY ("dispatcherUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "work_orders_assetId_idx" ON "work_orders"("assetId");
CREATE INDEX "work_orders_helpdeskTicketId_idx" ON "work_orders"("helpdeskTicketId");

-- Add work_order to EntityType enum for document linking
ALTER TYPE "EntityType" ADD VALUE 'work_order';
