-- Add kind and category to MioFinding for recommendation support
ALTER TABLE "mio_findings" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'finding';
ALTER TABLE "mio_findings" ADD COLUMN "category" TEXT;
