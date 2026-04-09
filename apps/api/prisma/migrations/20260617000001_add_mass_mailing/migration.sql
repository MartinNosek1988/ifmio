-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('email', 'sms', 'both');
CREATE TYPE "CampaignRecipientType" AS ENUM ('all_owners', 'all_tenants', 'all_residents', 'debtors', 'custom');
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE "RecipientStatus" AS ENUM ('pending', 'sent', 'failed', 'opened');

-- CreateTable
CREATE TABLE "mass_mailing_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "recipientType" "CampaignRecipientType" NOT NULL,
    "recipientIds" TEXT[],
    "propertyIds" TEXT[],
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mass_mailing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "residentId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "status" "RecipientStatus" NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "outboxLogId" TEXT,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mass_mailing_campaigns_tenantId_idx" ON "mass_mailing_campaigns"("tenantId");
CREATE INDEX "mass_mailing_campaigns_status_idx" ON "mass_mailing_campaigns"("status");
CREATE INDEX "mass_mailing_campaigns_propertyId_idx" ON "mass_mailing_campaigns"("propertyId");
CREATE INDEX "campaign_recipients_campaignId_idx" ON "campaign_recipients"("campaignId");
CREATE INDEX "campaign_recipients_status_idx" ON "campaign_recipients"("status");

-- AddForeignKey
ALTER TABLE "mass_mailing_campaigns" ADD CONSTRAINT "mass_mailing_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mass_mailing_campaigns" ADD CONSTRAINT "mass_mailing_campaigns_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "mass_mailing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS Policies
ALTER TABLE "mass_mailing_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_recipients" ENABLE ROW LEVEL SECURITY;
