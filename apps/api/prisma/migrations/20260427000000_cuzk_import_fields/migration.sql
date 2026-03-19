-- Property: import tracking fields
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "importSource" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cadastralData" JSONB;

-- Unit: cadastral metadata
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "cadastralData" JSONB;
