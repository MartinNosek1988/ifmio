-- Property: cadastral text fields
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cadastralArea" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "landRegistrySheet" TEXT;

-- Unit: hot water coefficient
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "hotWaterCoefficient" DOUBLE PRECISION;
