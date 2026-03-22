-- Add SETTLEMENT to LedgerSourceType enum (skip if enum doesn't exist yet — it's created in a later migration)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerSourceType') THEN
    ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'SETTLEMENT';
  END IF;
END $$;
