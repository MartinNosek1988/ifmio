-- AlterTable
ALTER TABLE "meters" ADD COLUMN "parentMeterId" TEXT;

-- CreateIndex
CREATE INDEX "meters_parentMeterId_idx" ON "meters"("parentMeterId");

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_parentMeterId_fkey" FOREIGN KEY ("parentMeterId") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
