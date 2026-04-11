-- CreateEnum
CREATE TYPE "TenantArchetype" AS ENUM ('SELF_MANAGED_HOA', 'MANAGEMENT_COMPANY', 'RENTAL_OWNER');

-- CreateEnum
CREATE TYPE "UserPropertyRoleType" AS ENUM ('MANAGER', 'ACCOUNTANT', 'TECHNICIAN', 'OWNER', 'TENANT_USER', 'VIEWER');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "archetype" "TenantArchetype",
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing tenants as completed
UPDATE "tenants" SET "onboardingCompleted" = true, "onboardingStep" = 4;

-- CreateTable
CREATE TABLE "user_property_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "role" "UserPropertyRoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_property_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_property_roles_tenantId_idx" ON "user_property_roles"("tenantId");
CREATE INDEX "user_property_roles_userId_idx" ON "user_property_roles"("userId");
CREATE INDEX "user_property_roles_propertyId_idx" ON "user_property_roles"("propertyId");
CREATE UNIQUE INDEX "user_property_roles_userId_propertyId_key" ON "user_property_roles"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "user_property_roles" ADD CONSTRAINT "user_property_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_property_roles" ADD CONSTRAINT "user_property_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_property_roles" ADD CONSTRAINT "user_property_roles_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
