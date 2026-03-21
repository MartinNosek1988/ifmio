-- CreateEnum
CREATE TYPE "ReceiverMode" AS ENUM ('USB', 'TCP_IP');

-- CreateTable
CREATE TABLE "hardware_voting_sessions" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bridgeApiKey" TEXT NOT NULL,
    "channelId" INTEGER NOT NULL DEFAULT 1,
    "receiverMode" "ReceiverMode" NOT NULL DEFAULT 'USB',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "currentItemId" TEXT,
    "votingOpen" BOOLEAN NOT NULL DEFAULT false,
    "connectedKeypads" INTEGER NOT NULL DEFAULT 0,
    "lastPingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hardware_voting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hardware_voting_sessions_assemblyId_key" ON "hardware_voting_sessions"("assemblyId");
CREATE UNIQUE INDEX "hardware_voting_sessions_bridgeApiKey_key" ON "hardware_voting_sessions"("bridgeApiKey");
CREATE INDEX "hardware_voting_sessions_tenantId_idx" ON "hardware_voting_sessions"("tenantId");
CREATE INDEX "hardware_voting_sessions_bridgeApiKey_idx" ON "hardware_voting_sessions"("bridgeApiKey");

-- AddForeignKey
ALTER TABLE "hardware_voting_sessions" ADD CONSTRAINT "hardware_voting_sessions_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
