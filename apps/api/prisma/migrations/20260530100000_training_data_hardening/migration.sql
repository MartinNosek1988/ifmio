-- ============================================================================
-- Training Data Hardening: stop storing raw PDF base64 in DB
-- ============================================================================
--
-- PROBLEM: InvoiceTrainingSample.imageBase64 stores full PDF as base64 text,
--   often 1-10 MB per row. This is a PII risk (invoices contain names,
--   addresses, IBANs) and wastes DB storage.
--
-- SOLUTION:
--   1. Add fileRef column (storage key pointing to local/S3 file)
--   2. Add expiresAt column for TTL cleanup
--   3. Make imageBase64 nullable (deprecated)
--   4. New rows will use fileRef; cron will clean up expired rows
--
-- ROLLBACK: These are additive changes only (new nullable columns + index).
--   To rollback: DROP INDEX, ALTER TABLE DROP COLUMN.
-- ============================================================================

-- Add fileRef column (storage key for PDF file)
ALTER TABLE public.invoice_training_samples
  ADD COLUMN IF NOT EXISTS "fileRef" TEXT;

-- Add expiresAt column for TTL
ALTER TABLE public.invoice_training_samples
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

-- Make imageBase64 nullable (was NOT NULL)
ALTER TABLE public.invoice_training_samples
  ALTER COLUMN "imageBase64" DROP NOT NULL;

-- Index for TTL cleanup queries
CREATE INDEX IF NOT EXISTS "idx_invoice_training_samples_expiresAt"
  ON public.invoice_training_samples ("expiresAt")
  WHERE "expiresAt" IS NOT NULL;

-- Backfill: set expiresAt = createdAt + 180 days for existing rows
-- This gives 6 months to migrate the training pipeline before cleanup.
UPDATE public.invoice_training_samples
  SET "expiresAt" = "createdAt" + INTERVAL '180 days'
  WHERE "expiresAt" IS NULL AND "imageBase64" IS NOT NULL;
