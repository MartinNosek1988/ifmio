-- CreateEnum
CREATE TYPE "RevisionPlanStatus" AS ENUM ('active', 'paused', 'archived');
CREATE TYPE "RevisionResultStatus" AS ENUM ('passed', 'passed_with_notes', 'failed', 'cancelled', 'planned');

-- CreateTable
CREATE TABLE "revision_subjects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'obecne',
    "description" TEXT,
    "location" TEXT,
    "assetTag" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultIntervalDays" INTEGER NOT NULL DEFAULT 365,
    "defaultReminderDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "revisionSubjectId" TEXT NOT NULL,
    "revisionTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "intervalDays" INTEGER NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "vendorName" TEXT,
    "responsibleUserId" TEXT,
    "lastPerformedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "status" "RevisionPlanStatus" NOT NULL DEFAULT 'active',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "revisionPlanId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "resultStatus" "RevisionResultStatus" NOT NULL DEFAULT 'planned',
    "summary" TEXT,
    "notes" TEXT,
    "vendorName" TEXT,
    "performedBy" TEXT,
    "protocolDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_subjects_tenantId_idx" ON "revision_subjects"("tenantId");
CREATE INDEX "revision_subjects_tenantId_propertyId_idx" ON "revision_subjects"("tenantId", "propertyId");

CREATE UNIQUE INDEX "revision_types_tenantId_code_key" ON "revision_types"("tenantId", "code");
CREATE INDEX "revision_types_tenantId_idx" ON "revision_types"("tenantId");
CREATE INDEX "revision_types_tenantId_isActive_idx" ON "revision_types"("tenantId", "isActive");

CREATE INDEX "revision_plans_tenantId_idx" ON "revision_plans"("tenantId");
CREATE INDEX "revision_plans_tenantId_propertyId_nextDueAt_idx" ON "revision_plans"("tenantId", "propertyId", "nextDueAt");
CREATE INDEX "revision_plans_tenantId_status_idx" ON "revision_plans"("tenantId", "status");
CREATE INDEX "revision_plans_revisionSubjectId_idx" ON "revision_plans"("revisionSubjectId");
CREATE INDEX "revision_plans_revisionTypeId_idx" ON "revision_plans"("revisionTypeId");

CREATE INDEX "revision_events_tenantId_idx" ON "revision_events"("tenantId");
CREATE INDEX "revision_events_tenantId_revisionPlanId_performedAt_idx" ON "revision_events"("tenantId", "revisionPlanId", "performedAt");
CREATE INDEX "revision_events_revisionPlanId_idx" ON "revision_events"("revisionPlanId");

-- AddForeignKey
ALTER TABLE "revision_subjects" ADD CONSTRAINT "revision_subjects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_subjects" ADD CONSTRAINT "revision_subjects_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revision_types" ADD CONSTRAINT "revision_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_revisionSubjectId_fkey" FOREIGN KEY ("revisionSubjectId") REFERENCES "revision_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_revisionTypeId_fkey" FOREIGN KEY ("revisionTypeId") REFERENCES "revision_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revision_events" ADD CONSTRAINT "revision_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_events" ADD CONSTRAINT "revision_events_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revision_events" ADD CONSTRAINT "revision_events_revisionPlanId_fkey" FOREIGN KEY ("revisionPlanId") REFERENCES "revision_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
