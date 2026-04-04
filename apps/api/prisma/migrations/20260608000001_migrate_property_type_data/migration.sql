-- Step 2: Migrate existing data to new PropertyType values
-- Runs in separate transaction after enum values are committed
UPDATE "properties" SET "type" = 'SVJ' WHERE "type" = 'bytdum';
UPDATE "properties" SET "type" = 'SINGLE_FAMILY' WHERE "type" = 'roddum';
UPDATE "properties" SET "type" = 'COMMERCIAL_OFFICE' WHERE "type" = 'komer';
UPDATE "properties" SET "type" = 'COMMERCIAL_INDUSTRIAL' WHERE "type" = 'prumysl';
UPDATE "properties" SET "type" = 'LAND' WHERE "type" = 'pozemek';
UPDATE "properties" SET "type" = 'PARKING' WHERE "type" = 'garaz';
