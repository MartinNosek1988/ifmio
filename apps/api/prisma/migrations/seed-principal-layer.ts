import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('M2: Starting Principal & FinancialContext data migration...')

  const tenants = await prisma.tenant.findMany({
    include: {
      properties: { include: { units: true } },
      bankAccounts: true,
    },
  })

  console.log(`Found ${tenants.length} tenant(s)`)

  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`)

    // STEP 1: Create manager Party from Tenant
    const managerParty = await prisma.party.upsert({
      where: { id: `party-manager-${tenant.id}` },
      create: {
        id: `party-manager-${tenant.id}`,
        tenantId: tenant.id,
        type: 'company',
        displayName: tenant.name,
        isActive: true,
      },
      update: {},
    })
    console.log(`  Party: ${managerParty.displayName}`)

    // STEP 2: Create default Principal
    const defaultPrincipal = await prisma.principal.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'DEFAULT' } },
      create: {
        id: `principal-default-${tenant.id}`,
        tenantId: tenant.id,
        partyId: managerParty.id,
        type: 'mixed_client',
        code: 'DEFAULT',
        displayName: `${tenant.name} (výchozí)`,
        isActive: true,
      },
      update: {},
    })
    console.log(`  Principal: ${defaultPrincipal.displayName}`)

    // STEP 3: For each Property → ManagementContract + FinancialContext
    for (const property of tenant.properties) {
      console.log(`  Property: ${property.name}`)

      const contract = await prisma.managementContract.upsert({
        where: { id: `contract-${defaultPrincipal.id}-${property.id}` },
        create: {
          id: `contract-${defaultPrincipal.id}-${property.id}`,
          tenantId: tenant.id,
          principalId: defaultPrincipal.id,
          propertyId: property.id,
          type: 'hoa_management',
          scope: 'whole_property',
          name: `Správa — ${property.name}`,
          isActive: true,
        },
        update: {},
      })
      console.log(`    ManagementContract: ${contract.name}`)

      const fcCode = `FC-${property.id.substring(0, 8)}`
      const finContext = await prisma.financialContext.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: fcCode } },
        create: {
          id: `finctx-${property.id}`,
          tenantId: tenant.id,
          principalId: defaultPrincipal.id,
          propertyId: property.id,
          managementContractId: contract.id,
          scopeType: 'property',
          code: fcCode,
          displayName: `Finance — ${property.name}`,
          currency: 'CZK',
          isActive: true,
        },
        update: {},
      })
      console.log(`    FinancialContext: ${finContext.displayName}`)

      // Link BankAccounts
      const ba = await prisma.bankAccount.updateMany({
        where: { tenantId: tenant.id, propertyId: property.id, financialContextId: null },
        data: { financialContextId: finContext.id },
      })
      if (ba.count > 0) console.log(`    Linked ${ba.count} BankAccount(s)`)

      // Link Invoices
      const inv = await prisma.invoice.updateMany({
        where: { tenantId: tenant.id, propertyId: property.id, financialContextId: null },
        data: { financialContextId: finContext.id },
      })
      if (inv.count > 0) console.log(`    Linked ${inv.count} Invoice(s)`)

      // Link Prescriptions
      const pres = await prisma.prescription.updateMany({
        where: { tenantId: tenant.id, propertyId: property.id, financialContextId: null },
        data: { financialContextId: finContext.id },
      })
      if (pres.count > 0) console.log(`    Linked ${pres.count} Prescription(s)`)

      // Link BankTransactions (via BankAccount propertyId)
      const propAccountIds = (tenant.bankAccounts || [])
        .filter((a: any) => a.propertyId === property.id)
        .map((a: any) => a.id)
      if (propAccountIds.length > 0) {
        const tx = await prisma.bankTransaction.updateMany({
          where: { tenantId: tenant.id, bankAccountId: { in: propAccountIds }, financialContextId: null },
          data: { financialContextId: finContext.id },
        })
        if (tx.count > 0) console.log(`    Linked ${tx.count} BankTransaction(s)`)
      }
    }

    // STEP 4: Orphan BankAccounts (no propertyId)
    const orphanBA = await prisma.bankAccount.count({
      where: { tenantId: tenant.id, financialContextId: null },
    })
    if (orphanBA > 0) {
      console.log(`  ${orphanBA} orphan BankAccount(s) — linking to principal context`)
      const pfc = await prisma.financialContext.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: 'FC-PRINCIPAL-DEFAULT' } },
        create: {
          id: `finctx-principal-${tenant.id}`,
          tenantId: tenant.id,
          principalId: defaultPrincipal.id,
          scopeType: 'principal',
          code: 'FC-PRINCIPAL-DEFAULT',
          displayName: `Finance — ${tenant.name} (výchozí)`,
          currency: 'CZK',
          isActive: true,
        },
        update: {},
      })
      await prisma.bankAccount.updateMany({
        where: { tenantId: tenant.id, financialContextId: null },
        data: { financialContextId: pfc.id },
      })
    }

    // STEP 5: Orphan Invoices (no propertyId)
    const orphanInvCount = await prisma.invoice.count({
      where: { tenantId: tenant.id, propertyId: null, financialContextId: null },
    })
    if (orphanInvCount > 0) {
      // Ensure principal-level FC exists
      const pfc = await prisma.financialContext.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: 'FC-PRINCIPAL-DEFAULT' } },
        create: {
          id: `finctx-principal-${tenant.id}`,
          tenantId: tenant.id,
          principalId: defaultPrincipal.id,
          scopeType: 'principal',
          code: 'FC-PRINCIPAL-DEFAULT',
          displayName: `Finance — ${tenant.name} (výchozí)`,
          currency: 'CZK',
          isActive: true,
        },
        update: {},
      })
      const orphanInv = await prisma.invoice.updateMany({
        where: { tenantId: tenant.id, propertyId: null, financialContextId: null },
        data: { financialContextId: pfc.id },
      })
      console.log(`  Linked ${orphanInv.count} orphan Invoice(s)`)
    }
  }

  // SUMMARY
  const [parties, principals, contracts, fcs, baLinked, invLinked, presLinked, txLinked] = await Promise.all([
    prisma.party.count(),
    prisma.principal.count(),
    prisma.managementContract.count(),
    prisma.financialContext.count(),
    prisma.bankAccount.count({ where: { financialContextId: { not: null } } }),
    prisma.invoice.count({ where: { financialContextId: { not: null } } }),
    prisma.prescription.count({ where: { financialContextId: { not: null } } }),
    prisma.bankTransaction.count({ where: { financialContextId: { not: null } } }),
  ])

  console.log('\n═══ SUMMARY ═══')
  console.log(`Parties:              ${parties}`)
  console.log(`Principals:           ${principals}`)
  console.log(`ManagementContracts:  ${contracts}`)
  console.log(`FinancialContexts:    ${fcs}`)
  console.log(`BankAccounts linked:  ${baLinked}`)
  console.log(`Invoices linked:      ${invLinked}`)
  console.log(`Prescriptions linked: ${presLinked}`)
  console.log(`BankTx linked:        ${txLinked}`)
}

main()
  .catch((e) => { console.error('M2 failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
