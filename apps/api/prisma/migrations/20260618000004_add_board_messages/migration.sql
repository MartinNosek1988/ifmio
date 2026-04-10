-- CreateTable
CREATE TABLE "board_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "attachmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "board_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_message_read_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_message_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_messages_tenantId_idx" ON "board_messages"("tenantId");

-- CreateIndex
CREATE INDEX "board_messages_propertyId_status_idx" ON "board_messages"("propertyId", "status");

-- CreateIndex
CREATE INDEX "board_messages_propertyId_isPinned_idx" ON "board_messages"("propertyId", "isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "board_message_read_receipts_messageId_userId_key" ON "board_message_read_receipts"("messageId", "userId");

-- CreateIndex
CREATE INDEX "board_message_read_receipts_tenantId_idx" ON "board_message_read_receipts"("tenantId");

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_message_read_receipts" ADD CONSTRAINT "board_message_read_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "board_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_message_read_receipts" ADD CONSTRAINT "board_message_read_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: Tenant isolation
ALTER TABLE "board_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_board_messages" ON "board_messages"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "board_message_read_receipts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_board_message_read_receipts" ON "board_message_read_receipts"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
