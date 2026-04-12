-- CreateEnum
CREATE TYPE "TenantSubjectType" AS ENUM ('svj_bd', 'spravce', 'vlastnik_domu', 'vlastnik_jednotky', 'najemnik', 'dodavatel');

-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('instalater', 'elektrikar', 'zamecnik', 'malir_naterac', 'podlahar', 'zednicke_prace', 'pokryvac', 'zahradnik', 'uklid', 'pest_control', 'revizni_technik', 'ucetni', 'pravnik', 'projekce', 'vymahani', 'sprava_nemovitosti', 'zatepleni', 'vytahy', 'pozarni_ochrana', 'jine');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "subjectType" "TenantSubjectType";

-- CreateTable
CREATE TABLE "supplier_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "ico" VARCHAR(8),
    "dic" TEXT,
    "isOsvc" BOOLEAN NOT NULL DEFAULT false,
    "categories" "SupplierCategory"[],
    "description" TEXT,
    "website" TEXT,
    "regionCity" TEXT,
    "regionRadius" INTEGER,
    "regionDistricts" TEXT[],
    "logoBase64" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_profiles_tenantId_idx" ON "supplier_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_profiles_regionCity_idx" ON "supplier_profiles"("regionCity");

-- AddForeignKey
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
