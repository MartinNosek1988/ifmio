-- P5.1c: UserPropertyAssignment table for property-level access control

-- Step 1: Create the table
CREATE TABLE "user_property_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_property_assignments_pkey" PRIMARY KEY ("id")
);

-- Step 2: Unique constraint (business key)
CREATE UNIQUE INDEX "user_property_assignments_userId_propertyId_key" ON "user_property_assignments"("userId", "propertyId");

-- Step 3: Indexes
CREATE INDEX "user_property_assignments_userId_idx" ON "user_property_assignments"("userId");
CREATE INDEX "user_property_assignments_propertyId_idx" ON "user_property_assignments"("propertyId");

-- Step 4: Foreign keys
ALTER TABLE "user_property_assignments" ADD CONSTRAINT "user_property_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_property_assignments" ADD CONSTRAINT "user_property_assignments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Backfill — assign all active properties to all active non-admin users
-- within the same tenant. This preserves current tenant-wide behavior.
-- Scope can then be narrowed manually per user via admin UI.
INSERT INTO "user_property_assignments" ("id", "userId", "propertyId", "assignedBy", "assignedAt")
SELECT gen_random_uuid(), u.id, p.id, NULL, NOW()
FROM "users" u
CROSS JOIN "properties" p
WHERE u."tenantId" = p."tenantId"
  AND u.role NOT IN ('tenant_owner', 'tenant_admin')
  AND u."isActive" = true
  AND p.status != 'archived'
ON CONFLICT ("userId", "propertyId") DO NOTHING;
