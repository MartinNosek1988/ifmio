-- Mio webhook subscriptions
CREATE TABLE "mio_webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eventTypes" TEXT[] NOT NULL DEFAULT '{}',
    "kindFilter" TEXT,
    "minSeverity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mio_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mio_webhook_subscriptions_tenantId_idx" ON "mio_webhook_subscriptions"("tenantId");
CREATE INDEX "mio_webhook_subscriptions_tenantId_isEnabled_idx" ON "mio_webhook_subscriptions"("tenantId", "isEnabled");

ALTER TABLE "mio_webhook_subscriptions" ADD CONSTRAINT "mio_webhook_subscriptions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mio webhook delivery logs
CREATE TABLE "mio_webhook_delivery_logs" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mio_webhook_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mio_webhook_delivery_logs_subscriptionId_createdAt_idx" ON "mio_webhook_delivery_logs"("subscriptionId", "createdAt");
CREATE INDEX "mio_webhook_delivery_logs_eventId_idx" ON "mio_webhook_delivery_logs"("eventId");

ALTER TABLE "mio_webhook_delivery_logs" ADD CONSTRAINT "mio_webhook_delivery_logs_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "mio_webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
