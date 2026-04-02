-- PVK Integration: credentials + sync log tables

CREATE TABLE IF NOT EXISTS public.pvk_credentials (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordEncrypted" TEXT NOT NULL,
  "lastSyncAt" TIMESTAMPTZ,
  "lastSyncStatus" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pvk_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pvk_credentials_tenantId_email_key" ON public.pvk_credentials ("tenantId", "email");
CREATE INDEX IF NOT EXISTS "pvk_credentials_tenantId_idx" ON public.pvk_credentials ("tenantId");

CREATE TABLE IF NOT EXISTS public.pvk_sync_logs (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "syncedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "invoices" INTEGER NOT NULL DEFAULT 0,
  "payments" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "durationMs" INTEGER,
  CONSTRAINT "pvk_sync_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "pvk_sync_logs_tenantId_syncedAt_idx" ON public.pvk_sync_logs ("tenantId", "syncedAt");

CREATE TABLE IF NOT EXISTS public.pvk_water_deductions (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "pvkPlaceId" INTEGER NOT NULL,
  "placeAddress" TEXT NOT NULL,
  "dateFrom" TIMESTAMPTZ NOT NULL,
  "dateTo" TIMESTAMPTZ NOT NULL,
  "meterNumber" TEXT NOT NULL,
  "valueFrom" DOUBLE PRECISION NOT NULL,
  "valueTo" DOUBLE PRECISION NOT NULL,
  "amountM3" DOUBLE PRECISION NOT NULL,
  "avgPerDay" DOUBLE PRECISION NOT NULL,
  "measurementType" TEXT NOT NULL,
  "intervalDays" INTEGER NOT NULL,
  "syncedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "pvk_water_deductions_tenant_place_date_meter_key"
  ON public.pvk_water_deductions ("tenantId", "pvkPlaceId", "dateFrom", "meterNumber");
CREATE INDEX IF NOT EXISTS "pvk_water_deductions_tenantId_idx" ON public.pvk_water_deductions ("tenantId");
