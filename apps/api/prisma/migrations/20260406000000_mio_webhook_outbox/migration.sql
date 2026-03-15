-- Mio webhook outbox for durable delivery
CREATE TABLE "mio_webhook_outbox" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "lastHttpStatus" INTEGER,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mio_webhook_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mio_webhook_outbox_status_nextAttemptAt_idx" ON "mio_webhook_outbox"("status", "nextAttemptAt");
CREATE INDEX "mio_webhook_outbox_subscriptionId_idx" ON "mio_webhook_outbox"("subscriptionId");

ALTER TABLE "mio_webhook_outbox" ADD CONSTRAINT "mio_webhook_outbox_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "mio_webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
