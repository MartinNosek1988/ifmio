-- Add self-service preference fields
ALTER TABLE "scheduled_report_subscriptions" ADD COLUMN "sendHour" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "scheduled_report_subscriptions" ADD COLUMN "workdaysOnly" BOOLEAN NOT NULL DEFAULT false;
