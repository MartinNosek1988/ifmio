-- Clean up any dangling document references before adding FK constraints
-- (set to NULL where referenced document no longer exists)
UPDATE "protocols" SET "generatedPdfDocumentId" = NULL
  WHERE "generatedPdfDocumentId" IS NOT NULL
  AND "generatedPdfDocumentId" NOT IN (SELECT "id" FROM "documents");

UPDATE "protocols" SET "signedDocumentId" = NULL
  WHERE "signedDocumentId" IS NOT NULL
  AND "signedDocumentId" NOT IN (SELECT "id" FROM "documents");

-- Add FK constraints for protocol document references
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_generatedPdfDocumentId_fkey"
  FOREIGN KEY ("generatedPdfDocumentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "protocols" ADD CONSTRAINT "protocols_signedDocumentId_fkey"
  FOREIGN KEY ("signedDocumentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
