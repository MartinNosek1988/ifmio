-- CreateEnum
CREATE TYPE "GarageVotingRule" AS ENUM ('PRESENT_MAJORITY', 'ALL_OWNERS_MAJORITY');

-- AlterTable: Unit — add garage fields
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "isGarageUnit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "garageVotingRule" "GarageVotingRule" NOT NULL DEFAULT 'PRESENT_MAJORITY';

-- AlterTable: AssemblyAgendaItem — add per-item quorum + garage internal votes
ALTER TABLE "assembly_agenda_items" ADD COLUMN IF NOT EXISTS "presentSharesAtVote" DECIMAL(12,6);
ALTER TABLE "assembly_agenda_items" ADD COLUMN IF NOT EXISTS "isQuorateAtVote" BOOLEAN;
ALTER TABLE "assembly_agenda_items" ADD COLUMN IF NOT EXISTS "garageInternalVotes" JSONB;

-- CreateTable: AttendeeKeypadAssignment
CREATE TABLE "attendee_keypad_assignments" (
    "id" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "keypadId" TEXT NOT NULL,
    "unitIds" TEXT[],
    "shareWeight" DECIMAL(12,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendee_keypad_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendee_keypad_assignments_attendeeId_keypadId_key" ON "attendee_keypad_assignments"("attendeeId", "keypadId");
CREATE INDEX "attendee_keypad_assignments_attendeeId_idx" ON "attendee_keypad_assignments"("attendeeId");

-- AddForeignKey
ALTER TABLE "attendee_keypad_assignments" ADD CONSTRAINT "attendee_keypad_assignments_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "assembly_attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
