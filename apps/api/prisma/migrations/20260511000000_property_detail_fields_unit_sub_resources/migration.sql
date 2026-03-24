-- Property: contact & geocoding fields
ALTER TABLE "properties" ADD COLUMN "contactName" TEXT;
ALTER TABLE "properties" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "properties" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "properties" ADD COLUMN "website" TEXT;
ALTER TABLE "properties" ADD COLUMN "websiteNote" TEXT;
ALTER TABLE "properties" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN "longitude" DOUBLE PRECISION;

-- UnitRoom
CREATE TABLE "unit_rooms" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "calculatedArea" DOUBLE PRECISION,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_rooms_pkey" PRIMARY KEY ("id")
);

-- UnitQuantity
CREATE TABLE "unit_quantities" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT '',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_quantities_pkey" PRIMARY KEY ("id")
);

-- UnitEquipment
CREATE TABLE "unit_equipment" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'functional',
    "note" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_equipment_pkey" PRIMARY KEY ("id")
);

-- UnitManagementFee
CREATE TABLE "unit_management_fees" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "calculationType" TEXT NOT NULL DEFAULT 'flat',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_management_fees_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "unit_rooms_tenantId_unitId_idx" ON "unit_rooms"("tenantId", "unitId");
CREATE INDEX "unit_quantities_tenantId_unitId_idx" ON "unit_quantities"("tenantId", "unitId");
CREATE UNIQUE INDEX "unit_quantities_tenantId_unitId_name_key" ON "unit_quantities"("tenantId", "unitId", "name");
CREATE INDEX "unit_equipment_tenantId_unitId_idx" ON "unit_equipment"("tenantId", "unitId");
CREATE INDEX "unit_management_fees_tenantId_unitId_idx" ON "unit_management_fees"("tenantId", "unitId");

-- Foreign keys
ALTER TABLE "unit_rooms" ADD CONSTRAINT "unit_rooms_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_rooms" ADD CONSTRAINT "unit_rooms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_quantities" ADD CONSTRAINT "unit_quantities_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_quantities" ADD CONSTRAINT "unit_quantities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_equipment" ADD CONSTRAINT "unit_equipment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_equipment" ADD CONSTRAINT "unit_equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_management_fees" ADD CONSTRAINT "unit_management_fees_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_management_fees" ADD CONSTRAINT "unit_management_fees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
