-- RevokedToken table for token blacklist (ZT-W3-01)
CREATE TABLE IF NOT EXISTS "revoked_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "revoked_tokens_jti_key" ON "revoked_tokens"("jti");
CREATE INDEX IF NOT EXISTS "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");
