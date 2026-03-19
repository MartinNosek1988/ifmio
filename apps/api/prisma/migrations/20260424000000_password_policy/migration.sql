-- Password policy fields on User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHistory" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
