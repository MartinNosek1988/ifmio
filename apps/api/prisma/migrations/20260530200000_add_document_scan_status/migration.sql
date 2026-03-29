-- ============================================================================
-- AV Scanning Pipeline: add scan status to documents
-- ============================================================================
--
-- Adds quarantine lifecycle to documents:
--   uploaded → pending_scan → quarantined → clean | infected | scan_error
--
-- When AV_SCANNING_ENABLED=false, documents get status 'skipped' immediately.
-- When AV_SCANNING_ENABLED=true, documents start as 'pending_scan' and must
-- pass through the scanner before being available for download/processing.
--
-- ROLLBACK: ALTER TABLE DROP COLUMN + DROP TYPE
-- ============================================================================

-- Create enum type
CREATE TYPE "ScanStatus" AS ENUM (
  'pending_scan',
  'quarantined',
  'clean',
  'infected',
  'scan_error',
  'skipped'
);

-- Add columns
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS "scanStatus" "ScanStatus" NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMPTZ;

-- Index for scanner polling (find pending/quarantined docs)
CREATE INDEX IF NOT EXISTS "idx_documents_scanStatus"
  ON public.documents ("scanStatus")
  WHERE "scanStatus" IN ('pending_scan', 'quarantined', 'scan_error');

-- Backfill: existing documents are treated as clean (pre-scanning era)
-- New uploads will get 'pending_scan' or 'skipped' depending on feature flag.
UPDATE public.documents SET "scanStatus" = 'skipped' WHERE "scanStatus" = 'pending_scan';
