-- Create enums
CREATE TYPE "ReportType" AS ENUM ('daily_digest', 'operations', 'assets', 'protocols');
CREATE TYPE "ReportFrequency" AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE "ReportFormat" AS ENUM ('xlsx', 'csv', 'email_only');

-- Create table
CREATE TABLE "scheduled_report_subscriptions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportType" "ReportType" NOT NULL,
  "frequency" "ReportFrequency" NOT NULL DEFAULT 'daily',
  "format" "ReportFormat" NOT NULL DEFAULT 'xlsx',
  "propertyId" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "scheduled_report_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scheduled_report_subscriptions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "scheduled_report_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "scheduled_report_subscriptions_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "scheduled_report_subscriptions_tenantId_idx" ON "scheduled_report_subscriptions"("tenantId");
CREATE INDEX "scheduled_report_subscriptions_userId_idx" ON "scheduled_report_subscriptions"("userId");
CREATE INDEX "scheduled_report_subscriptions_isEnabled_frequency_idx" ON "scheduled_report_subscriptions"("isEnabled", "frequency");
