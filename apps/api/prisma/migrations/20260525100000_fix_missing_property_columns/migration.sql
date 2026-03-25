-- Fix: these columns were supposed to be added by migration 20260511000000
-- but the transaction rolled back on CREATE TABLE unit_rooms (already existed).
-- The migration was then marked as --applied, so these columns were never created.

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "websiteNote" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
