-- CreateTable
CREATE TABLE "asset_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ostatni',
    "description" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "defaultLocationLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_type_revision_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "assetTypeId" UUID NOT NULL,
    "revisionTypeId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "intervalDaysOverride" INTEGER,
    "reminderDaysOverride" INTEGER,
    "graceDaysOverride" INTEGER,
    "requiresProtocolOverride" BOOLEAN,
    "requiresSupplierSignatureOverride" BOOLEAN,
    "requiresCustomerSignatureOverride" BOOLEAN,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_type_revision_types_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add assetTypeId to assets
ALTER TABLE "assets" ADD COLUMN "assetTypeId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "asset_types_tenantId_code_key" ON "asset_types"("tenantId", "code");
CREATE INDEX "asset_types_tenantId_idx" ON "asset_types"("tenantId");
CREATE INDEX "asset_types_tenantId_isActive_idx" ON "asset_types"("tenantId", "isActive");

CREATE UNIQUE INDEX "asset_type_revision_types_assetTypeId_revisionTypeId_key" ON "asset_type_revision_types"("assetTypeId", "revisionTypeId");
CREATE INDEX "asset_type_revision_types_tenantId_idx" ON "asset_type_revision_types"("tenantId");
CREATE INDEX "asset_type_revision_types_assetTypeId_idx" ON "asset_type_revision_types"("assetTypeId");
CREATE INDEX "asset_type_revision_types_revisionTypeId_idx" ON "asset_type_revision_types"("revisionTypeId");

CREATE INDEX "assets_assetTypeId_idx" ON "assets"("assetTypeId");

-- AddForeignKey
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_type_revision_types" ADD CONSTRAINT "asset_type_revision_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_type_revision_types" ADD CONSTRAINT "asset_type_revision_types_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "asset_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_type_revision_types" ADD CONSTRAINT "asset_type_revision_types_revisionTypeId_fkey" FOREIGN KEY ("revisionTypeId") REFERENCES "revision_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assets" ADD CONSTRAINT "assets_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "asset_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
