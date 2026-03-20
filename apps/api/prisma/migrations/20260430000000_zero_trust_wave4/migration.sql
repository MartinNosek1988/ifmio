-- ZT-W4-02: API Keys for integration access
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_idx" ON "api_keys"("tenantId");
CREATE INDEX IF NOT EXISTS "api_keys_keyHash_idx" ON "api_keys"("keyHash");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ZT-W4-03: Login Risk Logs for adaptive risk scoring
CREATE TABLE IF NOT EXISTS "login_risk_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskFactors" JSONB,
    "action" TEXT NOT NULL,
    "loginSuccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_risk_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_risk_logs_userId_createdAt_idx" ON "login_risk_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "login_risk_logs_tenantId_createdAt_idx" ON "login_risk_logs"("tenantId", "createdAt");
