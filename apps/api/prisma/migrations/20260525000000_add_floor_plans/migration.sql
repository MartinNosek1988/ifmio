-- FloorZoneType enum
CREATE TYPE "FloorZoneType" AS ENUM ('UNIT', 'COMMON_AREA', 'TECHNICAL', 'STORAGE', 'PARKING', 'OTHER');

-- FloorPlan
CREATE TABLE IF NOT EXISTS "floor_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "label" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "scaleMetersPerPixel" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- FloorPlanZone
CREATE TABLE IF NOT EXISTS "floor_plan_zones" (
    "id" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "unitId" TEXT,
    "label" TEXT,
    "zoneType" "FloorZoneType" NOT NULL DEFAULT 'UNIT',
    "polygon" JSONB NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plan_zones_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "floor_plans_tenantId_propertyId_idx" ON "floor_plans"("tenantId", "propertyId");
CREATE INDEX IF NOT EXISTS "floor_plan_zones_floorPlanId_idx" ON "floor_plan_zones"("floorPlanId");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floor_plans_propertyId_fkey') THEN
    ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floor_plan_zones_floorPlanId_fkey') THEN
    ALTER TABLE "floor_plan_zones" ADD CONSTRAINT "floor_plan_zones_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floor_plan_zones_unitId_fkey') THEN
    ALTER TABLE "floor_plan_zones" ADD CONSTRAINT "floor_plan_zones_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON UPDATE CASCADE;
  END IF;
END $$;
