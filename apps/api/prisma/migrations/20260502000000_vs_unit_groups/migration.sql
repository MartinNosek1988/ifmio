-- E2: Variable symbol on UnitOwnership and Tenancy
ALTER TABLE "unit_ownerships" ADD COLUMN IF NOT EXISTS "variableSymbol" TEXT;
ALTER TABLE "tenancies" ADD COLUMN IF NOT EXISTS "variableSymbol" TEXT;

-- E2: Unit groups (uspořádání jednotek)
CREATE TYPE "UnitGroupType" AS ENUM ('entrance', 'floor', 'custom');

CREATE TABLE IF NOT EXISTS "unit_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UnitGroupType" NOT NULL DEFAULT 'custom',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "unit_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "unit_group_memberships" (
    "id" TEXT NOT NULL,
    "unitGroupId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    CONSTRAINT "unit_group_memberships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "unit_groups_tenantId_propertyId_idx" ON "unit_groups"("tenantId", "propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "unit_group_memberships_unitGroupId_unitId_key" ON "unit_group_memberships"("unitGroupId", "unitId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_groups_tenantId_fkey') THEN
    ALTER TABLE "unit_groups" ADD CONSTRAINT "unit_groups_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_groups_propertyId_fkey') THEN
    ALTER TABLE "unit_groups" ADD CONSTRAINT "unit_groups_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_group_memberships_unitGroupId_fkey') THEN
    ALTER TABLE "unit_group_memberships" ADD CONSTRAINT "unit_group_memberships_unitGroupId_fkey"
      FOREIGN KEY ("unitGroupId") REFERENCES "unit_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_group_memberships_unitId_fkey') THEN
    ALTER TABLE "unit_group_memberships" ADD CONSTRAINT "unit_group_memberships_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
