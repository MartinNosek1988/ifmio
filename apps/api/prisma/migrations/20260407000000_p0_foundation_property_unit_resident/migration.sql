-- P0 Foundation: Property / Unit / Resident / Occupancy extensions for SVJ/BD

-- New enums
CREATE TYPE "PropertyLegalMode" AS ENUM ('SVJ', 'BD', 'RENTAL', 'OWNERSHIP', 'OTHER');
CREATE TYPE "AccountingSystem" AS ENUM ('POHODA', 'MONEY_S3', 'PREMIER', 'VARIO', 'NONE');
CREATE TYPE "SpaceType" AS ENUM ('RESIDENTIAL', 'NON_RESIDENTIAL', 'GARAGE', 'PARKING', 'CELLAR', 'LAND');

-- Property additions
ALTER TABLE "properties" ADD COLUMN "ico" TEXT;
ALTER TABLE "properties" ADD COLUMN "dic" TEXT;
ALTER TABLE "properties" ADD COLUMN "isVatPayer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "legalMode" "PropertyLegalMode" NOT NULL DEFAULT 'OWNERSHIP';
ALTER TABLE "properties" ADD COLUMN "managedFrom" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN "managedTo" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN "accountingSystem" "AccountingSystem";
ALTER TABLE "properties" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'CZ';

-- Unit additions
ALTER TABLE "units" ADD COLUMN "knDesignation" TEXT;
ALTER TABLE "units" ADD COLUMN "ownDesignation" TEXT;
ALTER TABLE "units" ADD COLUMN "spaceType" "SpaceType" NOT NULL DEFAULT 'RESIDENTIAL';
ALTER TABLE "units" ADD COLUMN "commonAreaShare" DECIMAL(10,6);
ALTER TABLE "units" ADD COLUMN "heatingArea" DOUBLE PRECISION;
ALTER TABLE "units" ADD COLUMN "tuvArea" DOUBLE PRECISION;
ALTER TABLE "units" ADD COLUMN "heatingCoefficient" DOUBLE PRECISION;
ALTER TABLE "units" ADD COLUMN "personCount" INTEGER;
ALTER TABLE "units" ADD COLUMN "disposition" TEXT;
ALTER TABLE "units" ADD COLUMN "hasElevator" BOOLEAN;
ALTER TABLE "units" ADD COLUMN "heatingMethod" TEXT;
ALTER TABLE "units" ADD COLUMN "validFrom" TIMESTAMP(3);
ALTER TABLE "units" ADD COLUMN "validTo" TIMESTAMP(3);
ALTER TABLE "units" ADD COLUMN "extAllocatorRef" TEXT;

-- Resident additions
ALTER TABLE "residents" ADD COLUMN "isLegalEntity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "residents" ADD COLUMN "ico" TEXT;
ALTER TABLE "residents" ADD COLUMN "dic" TEXT;
ALTER TABLE "residents" ADD COLUMN "companyName" TEXT;
ALTER TABLE "residents" ADD COLUMN "correspondenceAddress" TEXT;
ALTER TABLE "residents" ADD COLUMN "correspondenceCity" TEXT;
ALTER TABLE "residents" ADD COLUMN "correspondencePostalCode" TEXT;
ALTER TABLE "residents" ADD COLUMN "dataBoxId" TEXT;
ALTER TABLE "residents" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "residents" ADD COLUMN "note" TEXT;

-- Occupancy additions
ALTER TABLE "occupancies" ADD COLUMN "ownershipShare" DECIMAL(10,6);
ALTER TABLE "occupancies" ADD COLUMN "personCount" INTEGER;
ALTER TABLE "occupancies" ADD COLUMN "isPrimaryPayer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "occupancies" ADD COLUMN "variableSymbol" TEXT;

-- Indexes
CREATE INDEX "occupancies_variableSymbol_idx" ON "occupancies"("variableSymbol");
