-- CreateTable
CREATE TABLE "insurances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "annualPremium" DECIMAL(12,2),
    "insuredAmount" DECIMAL(14,2),
    "deductible" DECIMAL(12,2),
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "documentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "claimNumber" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "reportedDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "claimedAmount" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "ticketId" TEXT,
    "workOrderId" TEXT,
    "notes" TEXT,
    "documentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insurances_tenantId_idx" ON "insurances"("tenantId");
CREATE INDEX "insurances_propertyId_idx" ON "insurances"("propertyId");
CREATE INDEX "insurance_claims_tenantId_idx" ON "insurance_claims"("tenantId");
CREATE INDEX "insurance_claims_insuranceId_idx" ON "insurance_claims"("insuranceId");

-- AddForeignKey
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
