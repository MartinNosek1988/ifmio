-- CreateEnum
CREATE TYPE "KontoReminderStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KontoReminderMethod" AS ENUM ('EMAIL', 'DATABOX', 'POST', 'IN_PERSON');

-- CreateTable
CREATE TABLE "konto_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "reminderNumber" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentMethod" "KontoReminderMethod",
    "status" "KontoReminderStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "generatedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "konto_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "konto_reminders_tenantId_propertyId_idx" ON "konto_reminders"("tenantId", "propertyId");

-- CreateIndex
CREATE INDEX "konto_reminders_accountId_idx" ON "konto_reminders"("accountId");

-- CreateIndex
CREATE INDEX "konto_reminders_status_idx" ON "konto_reminders"("status");

-- AddForeignKey
ALTER TABLE "konto_reminders" ADD CONSTRAINT "konto_reminders_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konto_reminders" ADD CONSTRAINT "konto_reminders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "owner_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konto_reminders" ADD CONSTRAINT "konto_reminders_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konto_reminders" ADD CONSTRAINT "konto_reminders_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
