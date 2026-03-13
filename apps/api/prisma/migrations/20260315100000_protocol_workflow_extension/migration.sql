-- AlterEnum: add 'neutral' to Satisfaction
ALTER TYPE "Satisfaction" ADD VALUE 'neutral';

-- AlterTable: extend protocols with new fields
ALTER TABLE "protocols"
  ADD COLUMN "propertyId"            TEXT,
  ADD COLUMN "title"                 TEXT,
  ADD COLUMN "categoryLabel"         TEXT,
  ADD COLUMN "activityLabel"         TEXT,
  ADD COLUMN "spaceLabel"            TEXT,
  ADD COLUMN "tenantUnitLabel"       TEXT,
  ADD COLUMN "submittedAt"           TIMESTAMP(3),
  ADD COLUMN "dueAt"                 TIMESTAMP(3),
  ADD COLUMN "completedAt"           TIMESTAMP(3),
  ADD COLUMN "transportDescription"  TEXT,
  ADD COLUMN "publicNote"            TEXT,
  ADD COLUMN "internalNote"          TEXT;

-- AddForeignKey
ALTER TABLE "protocols"
  ADD CONSTRAINT "protocols_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "protocols_tenantId_propertyId_idx" ON "protocols"("tenantId", "propertyId");
