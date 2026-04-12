-- AlterTable: enforce NOT NULL + defaults on array columns and updatedAt
ALTER TABLE "supplier_profiles" ALTER COLUMN "categories" SET NOT NULL, ALTER COLUMN "categories" SET DEFAULT '{}';
ALTER TABLE "supplier_profiles" ALTER COLUMN "regionDistricts" SET NOT NULL, ALTER COLUMN "regionDistricts" SET DEFAULT '{}';
ALTER TABLE "supplier_profiles" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "supplier_profiles_userId_idx" ON "supplier_profiles"("userId");
