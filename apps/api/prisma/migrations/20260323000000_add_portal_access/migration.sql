-- Owner Portal — token-based public access + messaging

CREATE TABLE IF NOT EXISTS "portal_access" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "pin" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastAccessAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "portal_messages" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "propertyId" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_messages_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_accessToken_key" UNIQUE ("accessToken");
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_tenantId_email_key" UNIQUE ("tenantId", "email");

-- Foreign keys
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE;
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "portal_access_accessToken_idx" ON "portal_access"("accessToken");
CREATE INDEX IF NOT EXISTS "portal_access_tenantId_residentId_idx" ON "portal_access"("tenantId", "residentId");
CREATE INDEX IF NOT EXISTS "portal_messages_tenantId_residentId_idx" ON "portal_messages"("tenantId", "residentId");
CREATE INDEX IF NOT EXISTS "portal_messages_tenantId_direction_isRead_idx" ON "portal_messages"("tenantId", "direction", "isRead");
