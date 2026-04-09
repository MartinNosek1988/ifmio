-- CreateEnum
CREATE TYPE "CrmLeadType" AS ENUM ('property_manager', 'svj_direct', 'bd_direct', 'other');
CREATE TYPE "CrmStage" AS ENUM ('new_lead', 'contacted', 'demo_scheduled', 'demo_done', 'trial', 'negotiation', 'won', 'lost', 'not_interested');
CREATE TYPE "CrmPriority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "CrmActivityType" AS ENUM ('call', 'email', 'meeting', 'demo', 'note', 'stage_change');

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "kbOrganizationId" TEXT,
    "companyName" TEXT NOT NULL,
    "ico" TEXT,
    "address" TEXT,
    "city" TEXT,
    "leadType" "CrmLeadType" NOT NULL,
    "stage" "CrmStage" NOT NULL DEFAULT 'new_lead',
    "priority" "CrmPriority" NOT NULL DEFAULT 'medium',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactRole" TEXT,
    "estimatedUnits" INTEGER,
    "estimatedMrr" DECIMAL(10,2),
    "source" TEXT,
    "assignedTo" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_leads_stage_idx" ON "crm_leads"("stage");
CREATE INDEX "crm_leads_kbOrganizationId_idx" ON "crm_leads"("kbOrganizationId");
CREATE INDEX "crm_leads_leadType_idx" ON "crm_leads"("leadType");

CREATE INDEX "crm_activities_leadId_idx" ON "crm_activities"("leadId");
CREATE INDEX "crm_activities_occurredAt_idx" ON "crm_activities"("occurredAt");

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_kbOrganizationId_fkey" FOREIGN KEY ("kbOrganizationId") REFERENCES "kb_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_activities" ENABLE ROW LEVEL SECURITY;

-- Deny-all for non-service roles; service_role bypasses RLS automatically
CREATE POLICY "crm_leads_all" ON "crm_leads" USING (false) WITH CHECK (false);
CREATE POLICY "crm_activities_all" ON "crm_activities" USING (false) WITH CHECK (false);
