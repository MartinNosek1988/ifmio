-- CreateEnum
CREATE TYPE "QrScanOutcome" AS ENUM ('resolved', 'invalid', 'replaced', 'disabled', 'unauthorized');

-- CreateEnum
CREATE TYPE "QrScanSource" AS ENUM ('qr_scan', 'manual_open', 'redirected_after_login');

-- CreateEnum
CREATE TYPE "FieldCheckType" AS ENUM ('daily_check', 'inspection', 'service_check', 'route_check', 'custom');

-- CreateEnum
CREATE TYPE "FieldCheckStatus" AS ENUM ('started', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "FieldCheckResult" AS ENUM ('ok', 'issue_found', 'needs_follow_up', 'not_accessible');

-- CreateEnum
CREATE TYPE "FieldCheckConfidenceLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "FieldCheckSignalType" AS ENUM ('qr_scan', 'gps', 'photo', 'reading', 'checklist', 'manual_code');

-- CreateTable
CREATE TABLE "asset_qr_scan_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assetQrCodeId" TEXT,
    "userId" TEXT NOT NULL,
    "outcome" "QrScanOutcome" NOT NULL DEFAULT 'resolved',
    "source" "QrScanSource" NOT NULL DEFAULT 'qr_scan',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appVersion" TEXT,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "accuracyMeters" DECIMAL(8,2),
    "locationCapturedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "asset_qr_scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_field_check_executions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanEventId" TEXT,
    "revisionPlanId" TEXT,
    "checkType" "FieldCheckType" NOT NULL DEFAULT 'daily_check',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "FieldCheckStatus" NOT NULL DEFAULT 'started',
    "result" "FieldCheckResult",
    "notes" TEXT,
    "confidenceLevel" "FieldCheckConfidenceLevel" NOT NULL DEFAULT 'low',
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "asset_field_check_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_field_check_signals" (
    "id" TEXT NOT NULL,
    "fieldCheckExecutionId" TEXT NOT NULL,
    "signalType" "FieldCheckSignalType" NOT NULL,
    "isValid" BOOLEAN,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_field_check_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_qr_scan_events_tenantId_idx" ON "asset_qr_scan_events"("tenantId");

-- CreateIndex
CREATE INDEX "asset_qr_scan_events_assetId_idx" ON "asset_qr_scan_events"("assetId");

-- CreateIndex
CREATE INDEX "asset_qr_scan_events_userId_idx" ON "asset_qr_scan_events"("userId");

-- CreateIndex
CREATE INDEX "asset_qr_scan_events_assetQrCodeId_idx" ON "asset_qr_scan_events"("assetQrCodeId");

-- CreateIndex
CREATE INDEX "asset_qr_scan_events_scannedAt_idx" ON "asset_qr_scan_events"("scannedAt");

-- CreateIndex
CREATE INDEX "asset_field_check_executions_tenantId_idx" ON "asset_field_check_executions"("tenantId");

-- CreateIndex
CREATE INDEX "asset_field_check_executions_assetId_idx" ON "asset_field_check_executions"("assetId");

-- CreateIndex
CREATE INDEX "asset_field_check_executions_userId_idx" ON "asset_field_check_executions"("userId");

-- CreateIndex
CREATE INDEX "asset_field_check_executions_scanEventId_idx" ON "asset_field_check_executions"("scanEventId");

-- CreateIndex
CREATE INDEX "asset_field_check_executions_startedAt_idx" ON "asset_field_check_executions"("startedAt");

-- CreateIndex
CREATE INDEX "asset_field_check_signals_fieldCheckExecutionId_idx" ON "asset_field_check_signals"("fieldCheckExecutionId");

-- AddForeignKey
ALTER TABLE "asset_qr_scan_events" ADD CONSTRAINT "asset_qr_scan_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_scan_events" ADD CONSTRAINT "asset_qr_scan_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_scan_events" ADD CONSTRAINT "asset_qr_scan_events_assetQrCodeId_fkey" FOREIGN KEY ("assetQrCodeId") REFERENCES "asset_qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_scan_events" ADD CONSTRAINT "asset_qr_scan_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_executions" ADD CONSTRAINT "asset_field_check_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_executions" ADD CONSTRAINT "asset_field_check_executions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_executions" ADD CONSTRAINT "asset_field_check_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_executions" ADD CONSTRAINT "asset_field_check_executions_scanEventId_fkey" FOREIGN KEY ("scanEventId") REFERENCES "asset_qr_scan_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_executions" ADD CONSTRAINT "asset_field_check_executions_revisionPlanId_fkey" FOREIGN KEY ("revisionPlanId") REFERENCES "revision_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_check_signals" ADD CONSTRAINT "asset_field_check_signals_fieldCheckExecutionId_fkey" FOREIGN KEY ("fieldCheckExecutionId") REFERENCES "asset_field_check_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
