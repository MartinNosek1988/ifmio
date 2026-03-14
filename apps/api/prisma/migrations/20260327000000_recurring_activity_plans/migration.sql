-- RecurringActivityPlan table
CREATE TABLE "recurring_activity_plans" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT,
  "assetId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'maintenance',
  "scheduleMode" TEXT NOT NULL DEFAULT 'calendar',
  "frequencyUnit" TEXT NOT NULL DEFAULT 'day',
  "frequencyInterval" INTEGER NOT NULL DEFAULT 1,
  "dayOfWeek" INTEGER,
  "dayOfMonth" INTEGER,
  "monthOfYear" INTEGER,
  "leadDays" INTEGER NOT NULL DEFAULT 0,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "assigneeUserId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastCompletedAt" TIMESTAMPTZ,
  "nextPlannedAt" TIMESTAMPTZ,
  "lastGeneratedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "recurring_activity_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurring_activity_plans_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recurring_activity_plans_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "recurring_activity_plans_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "recurring_activity_plans_assigneeUserId_fkey"
    FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "recurring_activity_plans_tenantId_idx" ON "recurring_activity_plans"("tenantId");
CREATE INDEX "recurring_activity_plans_tenantId_isActive_idx" ON "recurring_activity_plans"("tenantId", "isActive");
CREATE INDEX "recurring_activity_plans_assetId_idx" ON "recurring_activity_plans"("assetId");
CREATE INDEX "recurring_activity_plans_tenantId_isActive_nextPlannedAt_idx" ON "recurring_activity_plans"("tenantId", "isActive", "nextPlannedAt");

-- Helpdesk ticket generation tracking fields
ALTER TABLE "helpdesk_tickets" ADD COLUMN "recurringPlanId" TEXT;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "generationKey" TEXT;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "plannedForDate" TIMESTAMPTZ;
ALTER TABLE "helpdesk_tickets" ADD COLUMN "requestOrigin" TEXT;

ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_recurringPlanId_fkey"
  FOREIGN KEY ("recurringPlanId") REFERENCES "recurring_activity_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "helpdesk_tickets_generationKey_key" ON "helpdesk_tickets"("generationKey");
CREATE INDEX "helpdesk_tickets_recurringPlanId_idx" ON "helpdesk_tickets"("recurringPlanId");
