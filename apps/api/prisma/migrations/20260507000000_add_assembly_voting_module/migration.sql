-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MajorityType" AS ENUM ('NADPOLOVICNI_PRITOMNYCH', 'NADPOLOVICNI_VSECH', 'KVALIFIKOVANA', 'JEDNOMYSLNA');
CREATE TYPE "VoteResult" AS ENUM ('SCHVALENO', 'NESCHVALENO', 'NEUSNASENO');
CREATE TYPE "VoteChoice" AS ENUM ('ANO', 'NE', 'ZDRZET');

-- CreateTable
CREATE TABLE "assemblies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assemblyNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" "AssemblyStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalShares" DECIMAL(12,6),
    "presentShares" DECIMAL(12,6),
    "isQuorate" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assemblies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_agenda_items" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requiresVote" BOOLEAN NOT NULL DEFAULT true,
    "majorityType" "MajorityType" NOT NULL DEFAULT 'NADPOLOVICNI_PRITOMNYCH',
    "result" "VoteResult",
    "votesFor" DECIMAL(12,6),
    "votesAgainst" DECIMAL(12,6),
    "votesAbstain" DECIMAL(12,6),
    "isCounterProposal" BOOLEAN NOT NULL DEFAULT false,
    "parentItemId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assembly_agenda_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_attendees" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "principalId" TEXT,
    "partyId" TEXT,
    "name" TEXT NOT NULL,
    "unitIds" TEXT[],
    "totalShare" DECIMAL(12,6) NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "hasPowerOfAttorney" BOOLEAN NOT NULL DEFAULT false,
    "powerOfAttorneyFrom" TEXT,
    "keypadId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assembly_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_votes" (
    "id" TEXT NOT NULL,
    "agendaItemId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "shareWeight" DECIMAL(12,6) NOT NULL,
    "keypadId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assembly_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assemblies_tenantId_idx" ON "assemblies"("tenantId");
CREATE INDEX "assemblies_tenantId_propertyId_idx" ON "assemblies"("tenantId", "propertyId");
CREATE INDEX "assembly_agenda_items_assemblyId_idx" ON "assembly_agenda_items"("assemblyId");
CREATE INDEX "assembly_attendees_assemblyId_idx" ON "assembly_attendees"("assemblyId");
CREATE INDEX "assembly_votes_agendaItemId_idx" ON "assembly_votes"("agendaItemId");
CREATE UNIQUE INDEX "assembly_votes_agendaItemId_attendeeId_key" ON "assembly_votes"("agendaItemId", "attendeeId");

-- AddForeignKey
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assembly_agenda_items" ADD CONSTRAINT "assembly_agenda_items_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_agenda_items" ADD CONSTRAINT "assembly_agenda_items_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "assembly_agenda_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_attendees" ADD CONSTRAINT "assembly_attendees_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_attendees" ADD CONSTRAINT "assembly_attendees_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "principals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_attendees" ADD CONSTRAINT "assembly_attendees_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_votes" ADD CONSTRAINT "assembly_votes_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "assembly_agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_votes" ADD CONSTRAINT "assembly_votes_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "assembly_attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
