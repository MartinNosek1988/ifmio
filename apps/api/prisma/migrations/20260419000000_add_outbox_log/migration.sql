CREATE TABLE IF NOT EXISTS "outbox_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "externalId" TEXT,
    "error" TEXT,
    "cost" DECIMAL(8,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outbox_logs_tenantId_channel_idx" ON "outbox_logs"("tenantId", "channel");
CREATE INDEX IF NOT EXISTS "outbox_logs_tenantId_createdAt_idx" ON "outbox_logs"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "outbox_logs" ADD CONSTRAINT "outbox_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
