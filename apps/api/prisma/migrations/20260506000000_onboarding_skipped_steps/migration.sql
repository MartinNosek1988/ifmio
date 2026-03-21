-- AlterTable — add onboarding columns to tenant_settings
-- onboardingDismissed was in the schema but never migrated
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "onboardingSkippedSteps" JSONB DEFAULT '[]';
