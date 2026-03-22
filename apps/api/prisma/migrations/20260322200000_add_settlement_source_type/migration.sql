-- Add SETTLEMENT to LedgerSourceType enum
ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'SETTLEMENT';
