-- CreateEnum
CREATE TYPE "ProtocolSourceType" AS ENUM ('helpdesk', 'revision', 'work_order');
CREATE TYPE "ProtocolType" AS ENUM ('work_report', 'handover', 'revision_report', 'service_protocol');
CREATE TYPE "ProtocolStatus" AS ENUM ('draft', 'completed', 'confirmed');
CREATE TYPE "Satisfaction" AS ENUM ('satisfied', 'partially_satisfied', 'dissatisfied');

-- CreateTable
CREATE TABLE "protocols" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" "ProtocolSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "protocolType" "ProtocolType" NOT NULL DEFAULT 'work_report',
    "number" TEXT NOT NULL,
    "status" "ProtocolStatus" NOT NULL DEFAULT 'draft',
    "supplierSnapshot" JSONB,
    "customerSnapshot" JSONB,
    "requesterName" TEXT,
    "dispatcherName" TEXT,
    "resolverName" TEXT,
    "description" TEXT,
    "transportKm" DOUBLE PRECISION,
    "transportMode" TEXT,
    "handoverAt" TIMESTAMP(3),
    "satisfaction" "Satisfaction",
    "satisfactionComment" TEXT,
    "supplierSignatureName" TEXT,
    "customerSignatureName" TEXT,
    "supplierSignedAt" TIMESTAMP(3),
    "customerSignedAt" TIMESTAMP(3),
    "generatedPdfDocumentId" TEXT,
    "signedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_lines" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "lineType" TEXT NOT NULL DEFAULT 'labor',
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_lines_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'protocol';
ALTER TYPE "EntityType" ADD VALUE 'revision';

-- CreateIndex
CREATE INDEX "protocols_tenantId_idx" ON "protocols"("tenantId");
CREATE INDEX "protocols_tenantId_sourceType_sourceId_idx" ON "protocols"("tenantId", "sourceType", "sourceId");
CREATE INDEX "protocols_tenantId_status_idx" ON "protocols"("tenantId", "status");
CREATE INDEX "protocol_lines_protocolId_idx" ON "protocol_lines"("protocolId");

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "protocol_lines" ADD CONSTRAINT "protocol_lines_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
