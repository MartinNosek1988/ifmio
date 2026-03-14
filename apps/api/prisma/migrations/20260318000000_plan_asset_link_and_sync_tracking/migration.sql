-- P7.1b: Link revision plans and subjects to assets + sync tracking fields

-- Add assetId to revision_subjects (for find-or-create per asset)
ALTER TABLE "revision_subjects" ADD COLUMN "assetId" TEXT;
CREATE INDEX "revision_subjects_assetId_idx" ON "revision_subjects"("assetId");
ALTER TABLE "revision_subjects" ADD CONSTRAINT "revision_subjects_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add tracking fields to revision_plans
ALTER TABLE "revision_plans" ADD COLUMN "assetId"               TEXT;
ALTER TABLE "revision_plans" ADD COLUMN "assetTypeAssignmentId" TEXT; -- references asset_type_revision_types.id (TEXT)
ALTER TABLE "revision_plans" ADD COLUMN "generatedFromAssetType" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revision_plans" ADD COLUMN "isCustomized"           BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "revision_plans_assetId_idx"              ON "revision_plans"("assetId");
CREATE INDEX "revision_plans_assetTypeAssignmentId_idx" ON "revision_plans"("assetTypeAssignmentId");

ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revision_plans" ADD CONSTRAINT "revision_plans_assetTypeAssignmentId_fkey"
  FOREIGN KEY ("assetTypeAssignmentId") REFERENCES "asset_type_revision_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
