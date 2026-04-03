-- Knowledge Base: tenant-agnostic canonical data models

-- Enums
CREATE TYPE "KbBuildingType" AS ENUM ('RESIDENTIAL_MULTI', 'RESIDENTIAL_SINGLE', 'COMMERCIAL', 'MIXED', 'INDUSTRIAL', 'OTHER_BUILDING');
CREATE TYPE "KbUnitType" AS ENUM ('APARTMENT', 'NON_RESIDENTIAL', 'GARAGE', 'CELLAR', 'PARKING_SPACE', 'OTHER_UNIT');
CREATE TYPE "KbOrgType" AS ENUM ('SVJ', 'BD', 'SRO', 'AS', 'MUNICIPALITY', 'STATE_ORG', 'OTHER_ORG');
CREATE TYPE "KbOwnershipType" AS ENUM ('SOLE', 'JOINT_SJM', 'CO_OWNERSHIP', 'OTHER_OWNERSHIP');
CREATE TYPE "KbDataSource" AS ENUM ('RUIAN', 'ARES', 'CUZK_KATASTER', 'CUZK_NAHLIDNI', 'JUSTICE_OR', 'ISIR', 'PENB', 'IPR_PRAHA', 'CENOVA_MAPA', 'MANUAL', 'IMPORT');

-- KB Organizations
CREATE TABLE "kb_organizations" (
    "id" TEXT NOT NULL,
    "ico" TEXT NOT NULL,
    "dic" TEXT,
    "name" TEXT NOT NULL,
    "nameShort" TEXT,
    "legalFormCode" TEXT,
    "legalFormName" TEXT,
    "orgType" "KbOrgType",
    "street" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "dateEstablished" TIMESTAMP(3),
    "dateCancelled" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
    "czNace" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataBoxId" TEXT,
    "lastAresSync" TIMESTAMP(3),
    "dataQualityScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kb_organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kb_organizations_ico_key" ON "kb_organizations"("ico");
CREATE INDEX "kb_organizations_orgType_idx" ON "kb_organizations"("orgType");
CREATE INDEX "kb_organizations_city_idx" ON "kb_organizations"("city");

-- KB Buildings
CREATE TABLE "kb_buildings" (
    "id" TEXT NOT NULL,
    "ruianBuildingId" TEXT,
    "ruianAddressId" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "orientationNumber" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "quarter" TEXT,
    "postalCode" TEXT,
    "fullAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sjtskX" DOUBLE PRECISION,
    "sjtskY" DOUBLE PRECISION,
    "cadastralTerritoryCode" TEXT,
    "cadastralTerritoryName" TEXT,
    "parcelNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landRegistrySheet" TEXT,
    "buildingType" "KbBuildingType",
    "constructionYear" INTEGER,
    "numberOfFloors" INTEGER,
    "numberOfUnits" INTEGER,
    "totalArea" DOUBLE PRECISION,
    "builtUpArea" DOUBLE PRECISION,
    "materialType" TEXT,
    "heatingType" TEXT,
    "penbClass" TEXT,
    "penbValidUntil" TIMESTAMP(3),
    "managingOrgId" TEXT,
    "dataQualityScore" DOUBLE PRECISION DEFAULT 0,
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kb_buildings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kb_buildings_ruianBuildingId_key" ON "kb_buildings"("ruianBuildingId");
CREATE INDEX "kb_buildings_city_district_idx" ON "kb_buildings"("city", "district");
CREATE INDEX "kb_buildings_postalCode_idx" ON "kb_buildings"("postalCode");
CREATE INDEX "kb_buildings_cadastralTerritoryCode_idx" ON "kb_buildings"("cadastralTerritoryCode");
CREATE INDEX "kb_buildings_managingOrgId_idx" ON "kb_buildings"("managingOrgId");
ALTER TABLE "kb_buildings" ADD CONSTRAINT "kb_buildings_managingOrgId_fkey" FOREIGN KEY ("managingOrgId") REFERENCES "kb_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- KB Building Units
CREATE TABLE "kb_building_units" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "ruianUnitId" TEXT,
    "katasterUnitId" TEXT,
    "unitNumber" TEXT,
    "unitType" "KbUnitType",
    "floor" INTEGER,
    "area" DOUBLE PRECISION,
    "roomCount" INTEGER,
    "roomLayout" TEXT,
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kb_building_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kb_building_units_ruianUnitId_key" ON "kb_building_units"("ruianUnitId");
CREATE INDEX "kb_building_units_buildingId_idx" ON "kb_building_units"("buildingId");
ALTER TABLE "kb_building_units" ADD CONSTRAINT "kb_building_units_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "kb_buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- KB Persons
CREATE TABLE "kb_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "city" TEXT,
    "nameNormalized" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kb_persons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_persons_lastName_firstName_idx" ON "kb_persons"("lastName", "firstName");
CREATE INDEX "kb_persons_nameNormalized_idx" ON "kb_persons"("nameNormalized");

-- KB Unit Ownerships
CREATE TABLE "kb_unit_ownerships" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "personId" TEXT,
    "organizationId" TEXT,
    "ownershipType" "KbOwnershipType",
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "lvNumber" TEXT,
    "registeredAt" TIMESTAMP(3),
    "sourceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kb_unit_ownerships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_unit_ownerships_unitId_idx" ON "kb_unit_ownerships"("unitId");
CREATE INDEX "kb_unit_ownerships_personId_idx" ON "kb_unit_ownerships"("personId");
CREATE INDEX "kb_unit_ownerships_organizationId_idx" ON "kb_unit_ownerships"("organizationId");
ALTER TABLE "kb_unit_ownerships" ADD CONSTRAINT "kb_unit_ownerships_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "kb_building_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_unit_ownerships" ADD CONSTRAINT "kb_unit_ownerships_personId_fkey" FOREIGN KEY ("personId") REFERENCES "kb_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kb_unit_ownerships" ADD CONSTRAINT "kb_unit_ownerships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kb_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- KB Statutory Bodies
CREATE TABLE "kb_statutory_bodies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kb_statutory_bodies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_statutory_bodies_organizationId_idx" ON "kb_statutory_bodies"("organizationId");
ALTER TABLE "kb_statutory_bodies" ADD CONSTRAINT "kb_statutory_bodies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kb_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Source tracking tables
CREATE TABLE "kb_building_sources" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "source" "KbDataSource" NOT NULL,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,
    "fieldsUpdated" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "kb_building_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_building_sources_buildingId_source_idx" ON "kb_building_sources"("buildingId", "source");
ALTER TABLE "kb_building_sources" ADD CONSTRAINT "kb_building_sources_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "kb_buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kb_building_unit_sources" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "source" "KbDataSource" NOT NULL,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,
    "fieldsUpdated" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "kb_building_unit_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_building_unit_sources_unitId_source_idx" ON "kb_building_unit_sources"("unitId", "source");
ALTER TABLE "kb_building_unit_sources" ADD CONSTRAINT "kb_building_unit_sources_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "kb_building_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kb_organization_sources" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "KbDataSource" NOT NULL,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,
    "fieldsUpdated" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "kb_organization_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kb_organization_sources_organizationId_source_idx" ON "kb_organization_sources"("organizationId", "source");
ALTER TABLE "kb_organization_sources" ADD CONSTRAINT "kb_organization_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kb_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK from business layer to Knowledge Base
ALTER TABLE "properties" ADD COLUMN "buildingId" TEXT;
CREATE INDEX "properties_buildingId_idx" ON "properties"("buildingId");
ALTER TABLE "properties" ADD CONSTRAINT "properties_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "kb_buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "units" ADD COLUMN "buildingUnitId" TEXT;
ALTER TABLE "units" ADD CONSTRAINT "units_buildingUnitId_fkey" FOREIGN KEY ("buildingUnitId") REFERENCES "kb_building_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
