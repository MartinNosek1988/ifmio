-- CreateTable
CREATE TABLE "justice_documents" (
    "id" TEXT NOT NULL,
    "ico" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "datumPodani" TIMESTAMP(3),
    "dokId" TEXT,
    "url" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justice_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "justice_documents_ico_idx" ON "justice_documents"("ico");
