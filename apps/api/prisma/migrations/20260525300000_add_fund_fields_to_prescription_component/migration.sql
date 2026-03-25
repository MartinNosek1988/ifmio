-- Add ACCESSORY to ComponentType enum
ALTER TYPE "ComponentType" ADD VALUE IF NOT EXISTS 'ACCESSORY';

-- Add RatePeriod enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RatePeriod') THEN
    CREATE TYPE "RatePeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
  END IF;
END $$;

-- Add new fields to prescription_components
ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "initialBalance" DECIMAL(14,2);
ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "includeInSettlement" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "minimumPayment" DECIMAL(12,2);
ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "ratePeriod" "RatePeriod" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "prescription_components" ADD COLUMN IF NOT EXISTS "ratePeriodMonths" INTEGER[] DEFAULT '{}';
