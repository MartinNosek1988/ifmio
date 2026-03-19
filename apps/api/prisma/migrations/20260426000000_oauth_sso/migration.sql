-- OAuth SSO fields on User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "oauthProvider" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "oauthId" TEXT;

-- Unique constraint for OAuth provider + ID pair
CREATE UNIQUE INDEX IF NOT EXISTS "users_oauthProvider_oauthId_key" ON "users"("oauthProvider", "oauthId");
