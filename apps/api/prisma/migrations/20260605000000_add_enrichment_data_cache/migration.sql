-- Add enrichment data cache to Building
ALTER TABLE "kb_buildings" ADD COLUMN "enrichmentData" JSONB;
ALTER TABLE "kb_buildings" ADD COLUMN "enrichedAt" TIMESTAMP(3);
