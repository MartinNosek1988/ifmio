-- User: TOTP 2FA fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpBackupCodes" JSONB;

-- RefreshToken: device tracking for multi-session
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
