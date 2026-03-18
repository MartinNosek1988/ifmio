-- Add new UserRole values
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'unit_owner';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'unit_tenant';

-- Make passwordHash nullable (for invitation-pending users)
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Add partyId to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "partyId" TEXT;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- TenantInvitation table
CREATE TABLE IF NOT EXISTS "tenant_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "propertyId" TEXT,
    "unitId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_invitations_token_key" ON "tenant_invitations"("token");
CREATE INDEX IF NOT EXISTS "tenant_invitations_tenantId_idx" ON "tenant_invitations"("tenantId");
CREATE INDEX IF NOT EXISTS "tenant_invitations_token_idx" ON "tenant_invitations"("token");

DO $$ BEGIN
  ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
