-- Structured handover fields
ALTER TABLE "work_orders" ADD COLUMN "workSummary" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "findings" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "recommendation" TEXT;

-- Completion requirements
ALTER TABLE "work_orders" ADD COLUMN "requirePhoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "work_orders" ADD COLUMN "requireHours" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "work_orders" ADD COLUMN "requireSummary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "work_orders" ADD COLUMN "requireProtocol" BOOLEAN NOT NULL DEFAULT false;
