-- AlterTable: extend KbPerson
ALTER TABLE "kb_persons" ADD COLUMN IF NOT EXISTS "titulPred" TEXT;
ALTER TABLE "kb_persons" ADD COLUMN IF NOT EXISTS "titulZa" TEXT;
ALTER TABLE "kb_persons" ADD COLUMN IF NOT EXISTS "datumNarozeni" TEXT;
ALTER TABLE "kb_persons" ADD COLUMN IF NOT EXISTS "adresa" TEXT;
ALTER TABLE "kb_persons" ADD COLUMN IF NOT EXISTS "statniObcanstvi" TEXT;

-- Drop old index if exists and create unique constraint
DROP INDEX IF EXISTS "kb_persons_lastName_firstName_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "kb_persons_lastName_datumNarozeni_key" ON "kb_persons"("lastName", "datumNarozeni");
CREATE INDEX IF NOT EXISTS "kb_persons_lastName_firstName_idx" ON "kb_persons"("lastName", "firstName");

-- AlterTable: extend KbOrganization
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "spisovaZnacka" TEXT;
ALTER TABLE "kb_organizations" ADD COLUMN IF NOT EXISTS "aresData" JSONB;

-- CreateTable: KbPersonEngagement
CREATE TABLE IF NOT EXISTS "kb_person_engagements" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "ico" TEXT NOT NULL,
    "nazevFirmy" TEXT NOT NULL,
    "funkce" TEXT NOT NULL,
    "od" TIMESTAMP(3),
    "do" TIMESTAMP(3),
    "aktivni" BOOLEAN NOT NULL DEFAULT true,
    "datumZapisu" TIMESTAMP(3),
    "datumVymazu" TIMESTAMP(3),
    "zdrojDat" TEXT NOT NULL DEFAULT 'dataor',
    "partnerIco" TEXT,
    "partnerNazev" TEXT,

    CONSTRAINT "kb_person_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "kb_person_engagements_ico_idx" ON "kb_person_engagements"("ico");
CREATE INDEX IF NOT EXISTS "kb_person_engagements_personId_idx" ON "kb_person_engagements"("personId");
CREATE INDEX IF NOT EXISTS "kb_person_engagements_aktivni_idx" ON "kb_person_engagements"("aktivni");
CREATE UNIQUE INDEX IF NOT EXISTS "kb_person_engagements_personId_ico_funkce_datumZapisu_key" ON "kb_person_engagements"("personId", "ico", "funkce", "datumZapisu");

-- AddForeignKey
ALTER TABLE "kb_person_engagements" ADD CONSTRAINT "kb_person_engagements_personId_fkey" FOREIGN KEY ("personId") REFERENCES "kb_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
