-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('person', 'company', 'hoa', 'organization_unit');
CREATE TYPE "PrincipalType" AS ENUM ('hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client');
CREATE TYPE "ManagementType" AS ENUM ('hoa_management', 'rental_management', 'technical_management', 'accounting_management', 'admin_management');
CREATE TYPE "ManagementScope" AS ENUM ('whole_property', 'selected_units');
CREATE TYPE "FinancialScopeType" AS ENUM ('property', 'principal', 'manager');
CREATE TYPE "OwnershipRole" AS ENUM ('legal_owner', 'beneficial_owner', 'managing_owner', 'silent_coowner');
CREATE TYPE "TenancyType" AS ENUM ('lease', 'sublease', 'occupancy', 'short_term');
CREATE TYPE "TenancyRole" AS ENUM ('tenant', 'co_tenant', 'occupant');

-- CreateTable: parties
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "ic" VARCHAR(20),
    "dic" VARCHAR(20),
    "vatId" VARCHAR(32),
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "street" TEXT,
    "street2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryCode" CHAR(2),
    "dataBoxId" TEXT,
    "bankAccount" TEXT,
    "bankCode" TEXT,
    "iban" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: property_ownerships
CREATE TABLE "property_ownerships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "OwnershipRole" NOT NULL DEFAULT 'legal_owner',
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "sharePercent" DECIMAL(7,4),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: unit_ownerships
CREATE TABLE "unit_ownerships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "OwnershipRole" NOT NULL DEFAULT 'legal_owner',
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "sharePercent" DECIMAL(7,4),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "unit_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenancies
CREATE TABLE "tenancies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "TenancyType" NOT NULL,
    "role" "TenancyRole" NOT NULL DEFAULT 'tenant',
    "contractNo" VARCHAR(100),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "moveInDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "rentAmount" DECIMAL(12,2),
    "serviceAdvanceAmount" DECIMAL(12,2),
    "depositAmount" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: principals
CREATE TABLE "principals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "PrincipalType" NOT NULL,
    "code" VARCHAR(50),
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "principals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: principal_owners
CREATE TABLE "principal_owners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "OwnershipRole" NOT NULL DEFAULT 'silent_coowner',
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "sharePercent" DECIMAL(7,4),
    "isManaging" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "principal_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable: management_contracts
CREATE TABLE "management_contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "ManagementType" NOT NULL,
    "scope" "ManagementScope" NOT NULL DEFAULT 'whole_property',
    "contractNo" VARCHAR(100),
    "name" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: management_contract_units
CREATE TABLE "management_contract_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "managementContractId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "management_contract_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable: financial_contexts
CREATE TABLE "financial_contexts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "principalId" TEXT,
    "propertyId" TEXT,
    "managementContractId" TEXT,
    "scopeType" "FinancialScopeType" NOT NULL,
    "code" VARCHAR(50),
    "displayName" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'CZK',
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatPayer" BOOLEAN NOT NULL DEFAULT false,
    "invoicePrefix" VARCHAR(20),
    "creditNotePrefix" VARCHAR(20),
    "orderPrefix" VARCHAR(20),
    "accountingSystem" VARCHAR(50),
    "brandingName" TEXT,
    "brandingEmail" TEXT,
    "brandingPhone" TEXT,
    "brandingWebsite" TEXT,
    "dopisOnlineUsername" TEXT,
    "dopisOnlineSender" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_contexts_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add financialContextId to existing tables
ALTER TABLE "bank_accounts" ADD COLUMN "financialContextId" TEXT;
ALTER TABLE "bank_transactions" ADD COLUMN "financialContextId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "financialContextId" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN "financialContextId" TEXT;

-- CreateIndex: parties
CREATE INDEX "parties_tenantId_displayName_idx" ON "parties"("tenantId", "displayName");
CREATE INDEX "parties_tenantId_ic_idx" ON "parties"("tenantId", "ic");
CREATE INDEX "parties_tenantId_type_idx" ON "parties"("tenantId", "type");

-- CreateIndex: property_ownerships
CREATE INDEX "property_ownerships_tenantId_propertyId_idx" ON "property_ownerships"("tenantId", "propertyId");
CREATE INDEX "property_ownerships_tenantId_partyId_idx" ON "property_ownerships"("tenantId", "partyId");
CREATE UNIQUE INDEX "property_ownerships_propertyId_partyId_validFrom_key" ON "property_ownerships"("propertyId", "partyId", "validFrom");

-- CreateIndex: unit_ownerships
CREATE INDEX "unit_ownerships_tenantId_unitId_idx" ON "unit_ownerships"("tenantId", "unitId");
CREATE INDEX "unit_ownerships_tenantId_partyId_idx" ON "unit_ownerships"("tenantId", "partyId");
CREATE UNIQUE INDEX "unit_ownerships_unitId_partyId_validFrom_key" ON "unit_ownerships"("unitId", "partyId", "validFrom");

-- CreateIndex: tenancies
CREATE INDEX "tenancies_tenantId_unitId_idx" ON "tenancies"("tenantId", "unitId");
CREATE INDEX "tenancies_tenantId_partyId_idx" ON "tenancies"("tenantId", "partyId");
CREATE INDEX "tenancies_tenantId_isActive_idx" ON "tenancies"("tenantId", "isActive");

-- CreateIndex: principals
CREATE INDEX "principals_tenantId_partyId_idx" ON "principals"("tenantId", "partyId");
CREATE INDEX "principals_tenantId_displayName_idx" ON "principals"("tenantId", "displayName");
CREATE UNIQUE INDEX "principals_tenantId_code_key" ON "principals"("tenantId", "code");

-- CreateIndex: principal_owners
CREATE INDEX "principal_owners_tenantId_principalId_idx" ON "principal_owners"("tenantId", "principalId");
CREATE INDEX "principal_owners_tenantId_partyId_idx" ON "principal_owners"("tenantId", "partyId");
CREATE UNIQUE INDEX "principal_owners_principalId_partyId_validFrom_key" ON "principal_owners"("principalId", "partyId", "validFrom");

-- CreateIndex: management_contracts
CREATE INDEX "management_contracts_tenantId_propertyId_idx" ON "management_contracts"("tenantId", "propertyId");
CREATE INDEX "management_contracts_tenantId_principalId_idx" ON "management_contracts"("tenantId", "principalId");
CREATE INDEX "management_contracts_tenantId_type_isActive_idx" ON "management_contracts"("tenantId", "type", "isActive");

-- CreateIndex: management_contract_units
CREATE UNIQUE INDEX "management_contract_units_managementContractId_unitId_key" ON "management_contract_units"("managementContractId", "unitId");
CREATE INDEX "management_contract_units_tenantId_unitId_idx" ON "management_contract_units"("tenantId", "unitId");

-- CreateIndex: financial_contexts
CREATE INDEX "financial_contexts_tenantId_principalId_idx" ON "financial_contexts"("tenantId", "principalId");
CREATE INDEX "financial_contexts_tenantId_propertyId_idx" ON "financial_contexts"("tenantId", "propertyId");
CREATE INDEX "financial_contexts_tenantId_managementContractId_idx" ON "financial_contexts"("tenantId", "managementContractId");
CREATE UNIQUE INDEX "financial_contexts_tenantId_code_key" ON "financial_contexts"("tenantId", "code");

-- CreateIndex: existing tables
CREATE INDEX "bank_accounts_financialContextId_idx" ON "bank_accounts"("financialContextId");
CREATE INDEX "bank_transactions_financialContextId_idx" ON "bank_transactions"("financialContextId");
CREATE INDEX "invoices_financialContextId_idx" ON "invoices"("financialContextId");
CREATE INDEX "prescriptions_financialContextId_idx" ON "prescriptions"("financialContextId");

-- AddForeignKey: parties
ALTER TABLE "parties" ADD CONSTRAINT "parties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: property_ownerships
ALTER TABLE "property_ownerships" ADD CONSTRAINT "property_ownerships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_ownerships" ADD CONSTRAINT "property_ownerships_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_ownerships" ADD CONSTRAINT "property_ownerships_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: unit_ownerships
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: tenancies
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: principals
ALTER TABLE "principals" ADD CONSTRAINT "principals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "principals" ADD CONSTRAINT "principals_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: principal_owners
ALTER TABLE "principal_owners" ADD CONSTRAINT "principal_owners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "principal_owners" ADD CONSTRAINT "principal_owners_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "principals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "principal_owners" ADD CONSTRAINT "principal_owners_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: management_contracts
ALTER TABLE "management_contracts" ADD CONSTRAINT "management_contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_contracts" ADD CONSTRAINT "management_contracts_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "principals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_contracts" ADD CONSTRAINT "management_contracts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: management_contract_units
ALTER TABLE "management_contract_units" ADD CONSTRAINT "management_contract_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_contract_units" ADD CONSTRAINT "management_contract_units_managementContractId_fkey" FOREIGN KEY ("managementContractId") REFERENCES "management_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_contract_units" ADD CONSTRAINT "management_contract_units_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: financial_contexts
ALTER TABLE "financial_contexts" ADD CONSTRAINT "financial_contexts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_contexts" ADD CONSTRAINT "financial_contexts_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "principals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_contexts" ADD CONSTRAINT "financial_contexts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_contexts" ADD CONSTRAINT "financial_contexts_managementContractId_fkey" FOREIGN KEY ("managementContractId") REFERENCES "management_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: existing tables → financial_contexts
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_financialContextId_fkey" FOREIGN KEY ("financialContextId") REFERENCES "financial_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
