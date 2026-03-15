-- Idempotence marker for recurring plan completion callback
ALTER TABLE "helpdesk_tickets" ADD COLUMN "recurringCompletionAppliedAt" TIMESTAMPTZ;
