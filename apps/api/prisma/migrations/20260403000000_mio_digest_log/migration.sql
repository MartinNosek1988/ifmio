-- Mio digest delivery log
CREATE TABLE "mio_digest_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "recommendationsCount" INTEGER NOT NULL DEFAULT 0,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mio_digest_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mio_digest_logs_tenantId_idx" ON "mio_digest_logs"("tenantId");
CREATE INDEX "mio_digest_logs_userId_createdAt_idx" ON "mio_digest_logs"("userId", "createdAt");

ALTER TABLE "mio_digest_logs" ADD CONSTRAINT "mio_digest_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mio_digest_logs" ADD CONSTRAINT "mio_digest_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
