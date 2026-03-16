-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('ADVANCE', 'FLAT_FEE', 'FUND', 'RENT', 'DEPOSIT', 'ANNUITY', 'OTHER');

-- CreateEnum
CREATE TYPE "CalculationMethod" AS ENUM ('FIXED', 'PER_AREA', 'PER_HEATING_AREA', 'PER_PERSON', 'PER_SHARE', 'MANUAL');

-- CreateTable
CREATE TABLE "prescription_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "componentType" "ComponentType" NOT NULL,
    "calculationMethod" "CalculationMethod" NOT NULL,
    "defaultAmount" DECIMAL(12,2) NOT NULL,
    "vatRate" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "accountingCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "overrideAmount" DECIMAL(12,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_assignments_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add componentId to prescription_items
ALTER TABLE "prescription_items" ADD COLUMN "componentId" TEXT;

-- CreateIndex
CREATE INDEX "prescription_components_tenantId_propertyId_idx" ON "prescription_components"("tenantId", "propertyId");
CREATE INDEX "prescription_components_tenantId_propertyId_isActive_idx" ON "prescription_components"("tenantId", "propertyId", "isActive");

CREATE UNIQUE INDEX "component_assignments_componentId_unitId_effectiveFrom_key" ON "component_assignments"("componentId", "unitId", "effectiveFrom");
CREATE INDEX "component_assignments_tenantId_componentId_idx" ON "component_assignments"("tenantId", "componentId");
CREATE INDEX "component_assignments_unitId_idx" ON "component_assignments"("unitId");

-- AddForeignKey
ALTER TABLE "prescription_components" ADD CONSTRAINT "prescription_components_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "prescription_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "prescription_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
