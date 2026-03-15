-- Add Mio governance config to tenant settings
ALTER TABLE "tenant_settings" ADD COLUMN "mioConfig" JSONB;
