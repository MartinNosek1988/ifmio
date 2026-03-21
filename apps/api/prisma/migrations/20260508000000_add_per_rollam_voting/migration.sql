-- CreateEnum
CREATE TYPE "PerRollamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BallotStatus" AS ENUM ('PENDING', 'SUBMITTED', 'MANUAL_ENTRY');
CREATE TYPE "BallotMethod" AS ENUM ('ONLINE', 'PAPER_UPLOAD', 'MANUAL');

-- CreateTable
CREATE TABLE "per_rollam_votings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "votingNumber" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "resultsNotifiedAt" TIMESTAMP(3),
    "status" "PerRollamStatus" NOT NULL DEFAULT 'DRAFT',
    "totalShares" DECIMAL(12,6),
    "respondedShares" DECIMAL(12,6),
    "isQuorate" BOOLEAN,
    "documentIds" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "per_rollam_votings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "per_rollam_items" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "majorityType" "MajorityType" NOT NULL DEFAULT 'NADPOLOVICNI_VSECH',
    "result" "VoteResult",
    "votesFor" DECIMAL(12,6),
    "votesAgainst" DECIMAL(12,6),
    "votesAbstain" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "per_rollam_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "per_rollam_ballots" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "principalId" TEXT,
    "partyId" TEXT,
    "name" TEXT NOT NULL,
    "unitIds" TEXT[],
    "totalShare" DECIMAL(12,6) NOT NULL,
    "status" "BallotStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "submissionMethod" "BallotMethod",
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "per_rollam_ballots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "per_rollam_responses" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "shareWeight" DECIMAL(12,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "per_rollam_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "per_rollam_votings_tenantId_idx" ON "per_rollam_votings"("tenantId");
CREATE INDEX "per_rollam_votings_tenantId_propertyId_idx" ON "per_rollam_votings"("tenantId", "propertyId");
CREATE INDEX "per_rollam_items_votingId_idx" ON "per_rollam_items"("votingId");
CREATE INDEX "per_rollam_ballots_votingId_idx" ON "per_rollam_ballots"("votingId");
CREATE INDEX "per_rollam_ballots_accessToken_idx" ON "per_rollam_ballots"("accessToken");
CREATE UNIQUE INDEX "per_rollam_ballots_accessToken_key" ON "per_rollam_ballots"("accessToken");
CREATE UNIQUE INDEX "per_rollam_responses_itemId_ballotId_key" ON "per_rollam_responses"("itemId", "ballotId");

-- AddForeignKey
ALTER TABLE "per_rollam_votings" ADD CONSTRAINT "per_rollam_votings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "per_rollam_items" ADD CONSTRAINT "per_rollam_items_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "per_rollam_votings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "per_rollam_ballots" ADD CONSTRAINT "per_rollam_ballots_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "per_rollam_votings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "per_rollam_ballots" ADD CONSTRAINT "per_rollam_ballots_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "principals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "per_rollam_ballots" ADD CONSTRAINT "per_rollam_ballots_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "per_rollam_responses" ADD CONSTRAINT "per_rollam_responses_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "per_rollam_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "per_rollam_responses" ADD CONSTRAINT "per_rollam_responses_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "per_rollam_ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
