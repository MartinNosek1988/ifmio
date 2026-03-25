-- UnitRoom: add roomType and includeTuv
ALTER TABLE "unit_rooms" ADD COLUMN IF NOT EXISTS "roomType" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "unit_rooms" ADD COLUMN IF NOT EXISTS "includeTuv" BOOLEAN NOT NULL DEFAULT true;

-- UnitEquipment: add extended fields
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "installPrice" DOUBLE PRECISION;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "warranty" INTEGER;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "lifetime" INTEGER;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "rentDuring" DOUBLE PRECISION;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "rentAfter" TEXT;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "useInPrescription" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP(3);
ALTER TABLE "unit_equipment" ADD COLUMN IF NOT EXISTS "description" TEXT;
