-- CreateEnum
CREATE TYPE "TerritoryLevel" AS ENUM ('STATE', 'REGION', 'DISTRICT', 'MUNICIPALITY', 'CITY_PART', 'CADASTRAL');

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT,
    "level" "TerritoryLevel" NOT NULL,
    "parentId" TEXT,
    "population" INTEGER,
    "area" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "zipCode" TEXT,
    "isCity" BOOLEAN NOT NULL DEFAULT false,
    "hasDistricts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "territories_code_key" ON "territories"("code");

-- CreateIndex
CREATE INDEX "territories_level_idx" ON "territories"("level");

-- CreateIndex
CREATE INDEX "territories_parentId_idx" ON "territories"("parentId");

-- CreateIndex
CREATE INDEX "territories_name_idx" ON "territories"("name");

-- CreateIndex
CREATE INDEX "territories_nameNormalized_idx" ON "territories"("nameNormalized");

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add territoryId to Building
ALTER TABLE "kb_buildings" ADD COLUMN "territoryId" TEXT;

-- CreateIndex
CREATE INDEX "kb_buildings_territoryId_idx" ON "kb_buildings"("territoryId");

-- AddForeignKey
ALTER TABLE "kb_buildings" ADD CONSTRAINT "kb_buildings_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
