-- CreateTable
CREATE TABLE "kb_ruian_obec" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "statusCode" INTEGER,
    "districtCode" INTEGER,
    "regionCode" INTEGER,
    "nutsLau" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_ruian_obec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_ruian_ulice" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "obecId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_ruian_ulice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_ruian_stavebni_objekt" (
    "id" INTEGER NOT NULL,
    "buildingType" TEXT,
    "numberOfFloors" INTEGER,
    "numberOfUnits" INTEGER,
    "builtUpArea" DOUBLE PRECISION,
    "buildingTechCode" INTEGER,
    "cadastralTerritoryCode" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "iscrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_ruian_stavebni_objekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_ruian_adresni_misto" (
    "id" INTEGER NOT NULL,
    "houseNumber" INTEGER,
    "orientationNumber" INTEGER,
    "orientationNumberLetter" TEXT,
    "postalCode" TEXT,
    "obecId" INTEGER,
    "uliceId" INTEGER,
    "stavebniObjektId" INTEGER,
    "castObceNazev" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_ruian_adresni_misto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_ruian_import_log" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileDate" TIMESTAMP(3) NOT NULL,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_ruian_import_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kb_ruian_ulice_obecId_idx" ON "kb_ruian_ulice"("obecId");
CREATE INDEX "kb_ruian_ulice_name_idx" ON "kb_ruian_ulice"("name");

-- CreateIndex
CREATE INDEX "kb_ruian_stavebni_objekt_cadastralTerritoryCode_idx" ON "kb_ruian_stavebni_objekt"("cadastralTerritoryCode");
CREATE INDEX "kb_ruian_stavebni_objekt_lat_lng_idx" ON "kb_ruian_stavebni_objekt"("lat", "lng");

-- CreateIndex
CREATE INDEX "kb_ruian_adresni_misto_obecId_idx" ON "kb_ruian_adresni_misto"("obecId");
CREATE INDEX "kb_ruian_adresni_misto_uliceId_idx" ON "kb_ruian_adresni_misto"("uliceId");
CREATE INDEX "kb_ruian_adresni_misto_stavebniObjektId_idx" ON "kb_ruian_adresni_misto"("stavebniObjektId");
CREATE INDEX "kb_ruian_adresni_misto_postalCode_idx" ON "kb_ruian_adresni_misto"("postalCode");
CREATE INDEX "kb_ruian_adresni_misto_lat_lng_idx" ON "kb_ruian_adresni_misto"("lat", "lng");

-- AddForeignKey
ALTER TABLE "kb_ruian_ulice" ADD CONSTRAINT "kb_ruian_ulice_obecId_fkey" FOREIGN KEY ("obecId") REFERENCES "kb_ruian_obec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kb_ruian_adresni_misto" ADD CONSTRAINT "kb_ruian_adresni_misto_obecId_fkey" FOREIGN KEY ("obecId") REFERENCES "kb_ruian_obec"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kb_ruian_adresni_misto" ADD CONSTRAINT "kb_ruian_adresni_misto_uliceId_fkey" FOREIGN KEY ("uliceId") REFERENCES "kb_ruian_ulice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kb_ruian_adresni_misto" ADD CONSTRAINT "kb_ruian_adresni_misto_stavebniObjektId_fkey" FOREIGN KEY ("stavebniObjektId") REFERENCES "kb_ruian_stavebni_objekt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
