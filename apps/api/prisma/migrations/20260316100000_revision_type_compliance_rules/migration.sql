-- Add compliance rule fields to revision_types
ALTER TABLE "revision_types" ADD COLUMN "requiresProtocol" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revision_types" ADD COLUMN "defaultProtocolType" TEXT;
ALTER TABLE "revision_types" ADD COLUMN "requiresSupplierSignature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revision_types" ADD COLUMN "requiresCustomerSignature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revision_types" ADD COLUMN "graceDaysAfterEvent" INTEGER NOT NULL DEFAULT 14;
