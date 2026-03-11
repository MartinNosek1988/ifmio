-- High-impact compound indexes for invoices and bank transactions.
-- Targets: overdue/stats queries, unmatched transaction pagination, import dedup checks.

-- CreateIndex
CREATE INDEX "invoices_tenantId_isPaid_dueDate_idx" ON "invoices"("tenantId", "isPaid", "dueDate");

-- CreateIndex
CREATE INDEX "bank_transactions_tenantId_status_date_idx" ON "bank_transactions"("tenantId", "status", "date");

-- CreateIndex
CREATE INDEX "bank_transactions_tenantId_bankAccountId_date_amount_variab_idx" ON "bank_transactions"("tenantId", "bankAccountId", "date", "amount", "variableSymbol");
