-- S1: AllocationMethod enum + column on PrescriptionComponent
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AllocationMethod') THEN
    CREATE TYPE "AllocationMethod" AS ENUM ('area', 'share', 'persons', 'consumption', 'equal', 'heating_area', 'custom');
  END IF;
END $$;

ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "allocationMethod" "AllocationMethod" NOT NULL DEFAULT 'area';
