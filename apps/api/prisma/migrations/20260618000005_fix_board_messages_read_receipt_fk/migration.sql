-- AddForeignKey (missing from 20260618000004)
ALTER TABLE "board_message_read_receipts" ADD CONSTRAINT "board_message_read_receipts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
