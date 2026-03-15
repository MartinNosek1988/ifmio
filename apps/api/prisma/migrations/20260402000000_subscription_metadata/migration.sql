-- Add metadata JSON field to scheduled_report_subscriptions
ALTER TABLE "scheduled_report_subscriptions" ADD COLUMN "metadata" JSONB;
