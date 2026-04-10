-- CreateTable
CREATE TABLE "ticr_credentials" (
    "id" TEXT NOT NULL,
    "ico" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "ticrPersonId" TEXT,
    "evidenceNumber" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "deviceType" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "qualificationRef" TEXT,
    "registryType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticr_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticr_credentials_evidenceNumber_registryType_key" ON "ticr_credentials"("evidenceNumber", "registryType");

-- CreateIndex
CREATE INDEX "ticr_credentials_ico_idx" ON "ticr_credentials"("ico");

-- CreateIndex
CREATE INDEX "ticr_credentials_deviceType_idx" ON "ticr_credentials"("deviceType");

-- CreateIndex
CREATE INDEX "ticr_credentials_registryType_idx" ON "ticr_credentials"("registryType");

-- CreateIndex
CREATE INDEX "ticr_credentials_validUntil_idx" ON "ticr_credentials"("validUntil");
