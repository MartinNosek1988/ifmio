-- AlterTable
ALTER TABLE "kb_building_units" ADD COLUMN "lvNumber" TEXT;
ALTER TABLE "kb_building_units" ADD COLUMN "usage" TEXT;
ALTER TABLE "kb_building_units" ADD COLUMN "cuzkStavbaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "kb_building_units_buildingId_unitNumber_key"
  ON "kb_building_units"("buildingId", "unitNumber");
