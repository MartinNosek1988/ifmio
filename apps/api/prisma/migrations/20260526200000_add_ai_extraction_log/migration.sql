-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_extraction_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "confidence" TEXT NOT NULL,
    "fileName" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ai_extraction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_extraction_logs_tenantId_idx" ON "ai_extraction_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "ai_extraction_logs_tenantId_createdAt_idx" ON "ai_extraction_logs"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_extraction_logs" ADD CONSTRAINT "ai_extraction_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_extraction_logs" ADD CONSTRAINT "ai_extraction_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
