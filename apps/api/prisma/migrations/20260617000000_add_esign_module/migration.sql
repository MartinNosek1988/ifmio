-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ESignDocumentType" AS ENUM ('management_contract', 'tenancy', 'protocol', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ESignStatus" AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ESignSignatoryStatus" AS ENUM ('pending', 'viewed', 'signed', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "esign_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "ESignDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" "ESignStatus" NOT NULL DEFAULT 'draft',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    CONSTRAINT "esign_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "esign_requests_tenantId_idx" ON "esign_requests"("tenantId");
CREATE INDEX IF NOT EXISTS "esign_requests_documentType_documentId_idx" ON "esign_requests"("documentType", "documentId");

CREATE TABLE IF NOT EXISTS "esign_signatories" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ESignSignatoryStatus" NOT NULL DEFAULT 'pending',
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureBase64" TEXT,
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "gdprErasedAt" TIMESTAMP(3),
    CONSTRAINT "esign_signatories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "esign_signatories_token_key" ON "esign_signatories"("token");
CREATE INDEX IF NOT EXISTS "esign_signatories_requestId_idx" ON "esign_signatories"("requestId");
CREATE INDEX IF NOT EXISTS "esign_signatories_token_idx" ON "esign_signatories"("token");

ALTER TABLE "esign_signatories" ADD CONSTRAINT "esign_signatories_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "esign_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
