-- Rename existing PropertyType enum values and add new ones
-- Step 1: Add new values
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SVJ';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'BD';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'RENTAL_RESIDENTIAL';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'RENTAL_MUNICIPAL';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'CONDO_NO_SVJ';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'MIXED_USE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SINGLE_FAMILY';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_OFFICE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_RETAIL';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_WAREHOUSE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_INDUSTRIAL';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'PARKING';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'LAND';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'OTHER';

-- Step 2: Migrate existing data to new values
UPDATE "properties" SET "type" = 'SVJ' WHERE "type" = 'bytdum';
UPDATE "properties" SET "type" = 'SINGLE_FAMILY' WHERE "type" = 'roddum';
UPDATE "properties" SET "type" = 'COMMERCIAL_OFFICE' WHERE "type" = 'komer';
UPDATE "properties" SET "type" = 'COMMERCIAL_INDUSTRIAL' WHERE "type" = 'prumysl';
UPDATE "properties" SET "type" = 'LAND' WHERE "type" = 'pozemek';
UPDATE "properties" SET "type" = 'PARKING' WHERE "type" = 'garaz';

-- Note: Old enum values (bytdum, roddum, komer, prumysl, pozemek, garaz) remain in the
-- PostgreSQL enum type but are no longer used. PostgreSQL does not support DROP VALUE from enums.
-- They will be ignored by Prisma since they're not in the schema.
