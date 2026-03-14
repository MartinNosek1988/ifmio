-- CreateEnum
CREATE TYPE "AssetQrStatus" AS ENUM ('active', 'replaced', 'disabled');

-- CreateTable
CREATE TABLE "asset_qr_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "humanCode" TEXT NOT NULL,
    "status" "AssetQrStatus" NOT NULL DEFAULT 'active',
    "labelVersion" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" TIMESTAMP(3),
    "replacedAt" TIMESTAMP(3),
    "replacedByQrCodeId" TEXT,
    "notes" TEXT,

    CONSTRAINT "asset_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_qr_codes_token_key" ON "asset_qr_codes"("token");

-- CreateIndex
CREATE INDEX "asset_qr_codes_tenantId_idx" ON "asset_qr_codes"("tenantId");

-- CreateIndex
CREATE INDEX "asset_qr_codes_assetId_idx" ON "asset_qr_codes"("assetId");

-- CreateIndex
CREATE INDEX "asset_qr_codes_token_idx" ON "asset_qr_codes"("token");

-- CreateIndex
CREATE INDEX "asset_qr_codes_assetId_status_idx" ON "asset_qr_codes"("assetId", "status");

-- AddForeignKey
ALTER TABLE "asset_qr_codes" ADD CONSTRAINT "asset_qr_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_codes" ADD CONSTRAINT "asset_qr_codes_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_codes" ADD CONSTRAINT "asset_qr_codes_replacedByQrCodeId_fkey" FOREIGN KEY ("replacedByQrCodeId") REFERENCES "asset_qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
