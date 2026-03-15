CREATE TABLE "mio_findings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "confidence" TEXT NOT NULL DEFAULT 'high',
  "status" TEXT NOT NULL DEFAULT 'active',
  "entityType" TEXT,
  "entityId" TEXT,
  "entityCount" INTEGER,
  "fingerprint" TEXT NOT NULL,
  "actionLabel" TEXT,
  "actionUrl" TEXT,
  "helpdeskTicketId" TEXT,
  "ticketCreatedAutomatically" BOOLEAN NOT NULL DEFAULT false,
  "firstDetectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMPTZ,
  "dismissedAt" TIMESTAMPTZ,
  "snoozedUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "mio_findings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mio_findings_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mio_findings_fingerprint_key" ON "mio_findings"("fingerprint");
CREATE INDEX "mio_findings_tenantId_idx" ON "mio_findings"("tenantId");
CREATE INDEX "mio_findings_tenantId_status_idx" ON "mio_findings"("tenantId", "status");
CREATE INDEX "mio_findings_tenantId_severity_status_idx" ON "mio_findings"("tenantId", "severity", "status");
