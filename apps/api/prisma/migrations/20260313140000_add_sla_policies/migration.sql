-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "lowResponseH" INTEGER NOT NULL DEFAULT 72,
    "lowResolutionH" INTEGER NOT NULL DEFAULT 336,
    "mediumResponseH" INTEGER NOT NULL DEFAULT 24,
    "mediumResolutionH" INTEGER NOT NULL DEFAULT 120,
    "highResponseH" INTEGER NOT NULL DEFAULT 8,
    "highResolutionH" INTEGER NOT NULL DEFAULT 48,
    "urgentResponseH" INTEGER NOT NULL DEFAULT 1,
    "urgentResolutionH" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sla_policies_tenantId_idx" ON "sla_policies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policies_tenantId_propertyId_key" ON "sla_policies"("tenantId", "propertyId");

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
