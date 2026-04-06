-- KbOrganization: catalog & financial fields
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "catalogTags" TEXT[] DEFAULT '{}';
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "catalogRating" DOUBLE PRECISION;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "catalogWoCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "lastRevenueYear" INTEGER;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "lastRevenue" BIGINT;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "lastProfit" BIGINT;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "insolvent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "insolventCheckedAt" TIMESTAMP(3);
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "rzpData" JSONB;

-- Indexes
CREATE INDEX IF NOT EXISTS "kb_organizations_legalFormCode_idx" ON "kb_organizations"("legalFormCode");
CREATE INDEX IF NOT EXISTS "kb_organizations_name_idx" ON "kb_organizations"("name");

-- KbPersonEngagement: partnerIco index + organization FK
CREATE INDEX IF NOT EXISTS "kb_person_engagements_partnerIco_idx" ON "kb_person_engagements"("partnerIco");

-- FK: engagement → organization (ico → ico)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_person_engagements_ico_fkey'
  ) THEN
    ALTER TABLE "kb_person_engagements"
      ADD CONSTRAINT "kb_person_engagements_ico_fkey"
      FOREIGN KEY ("ico") REFERENCES "kb_organizations"("ico")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
