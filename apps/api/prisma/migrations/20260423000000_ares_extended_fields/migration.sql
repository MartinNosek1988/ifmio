-- Tenant: add ico + dic for FM company identification
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ico" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "dic" TEXT;

-- Property: add dataBoxId for SVJ/BD data box
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "dataBoxId" TEXT;

-- Party: add ARES-sourced fields
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "pravniForma" TEXT;
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "pravniFormaKod" TEXT;
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "datumVzniku" TIMESTAMP(3);
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "datumZaniku" TIMESTAMP(3);
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "czNace" JSONB;
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "zastupci" JSONB;
