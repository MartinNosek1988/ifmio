-- Add mio_digest to ReportType enum
ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'mio_digest';
