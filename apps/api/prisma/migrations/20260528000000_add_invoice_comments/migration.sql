-- CreateTable
CREATE TABLE "invoice_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userInitials" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'note',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_comments_invoiceId_createdAt_idx" ON "invoice_comments"("invoiceId", "createdAt");
CREATE INDEX "invoice_comments_tenantId_idx" ON "invoice_comments"("tenantId");

-- AddForeignKey
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
