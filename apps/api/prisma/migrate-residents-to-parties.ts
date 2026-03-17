/**
 * Migrate existing Residents to Party records.
 * For each Resident without partyId:
 *   1. Try to find existing Party with matching ic OR (displayName + email)
 *   2. If found → link
 *   3. If not found → create new Party, then link
 *
 * Idempotent: safe to run multiple times.
 * Does NOT delete any Resident data.
 *
 * Usage: cd apps/api && npx tsx prisma/migrate-residents-to-parties.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const residents = await prisma.resident.findMany({
    where: { partyId: null },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${residents.length} residents without partyId`)

  let linked = 0
  let created = 0
  let skipped = 0

  for (const r of residents) {
    try {
      // Build display name
      const displayName = r.isLegalEntity && r.companyName
        ? r.companyName
        : [r.lastName, r.firstName].filter(Boolean).join(' ') || `${r.firstName} ${r.lastName}`

      // Determine party type
      const type = r.isLegalEntity ? 'company' : 'person'

      // Try to find existing Party by IČ
      let party = r.ico
        ? await prisma.party.findFirst({
            where: { tenantId: r.tenantId, ic: r.ico, isActive: true },
          })
        : null

      // Try by displayName + email
      if (!party && r.email) {
        party = await prisma.party.findFirst({
          where: { tenantId: r.tenantId, email: r.email, isActive: true },
        })
      }

      if (!party) {
        // Try by exact displayName match
        party = await prisma.party.findFirst({
          where: { tenantId: r.tenantId, displayName, isActive: true },
        })
      }

      if (party) {
        // Link to existing Party
        await prisma.resident.update({
          where: { id: r.id },
          data: { partyId: party.id },
        })
        linked++
      } else {
        // Create new Party
        const newParty = await prisma.party.create({
          data: {
            tenantId: r.tenantId,
            type: type as any,
            displayName,
            firstName: r.firstName || undefined,
            lastName: r.lastName || undefined,
            companyName: r.companyName || undefined,
            ic: r.ico || undefined,
            dic: r.dic || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            street: r.correspondenceAddress || undefined,
            city: r.correspondenceCity || undefined,
            postalCode: r.correspondencePostalCode || undefined,
            dataBoxId: r.dataBoxId || undefined,
            note: r.note || undefined,
            isActive: r.isActive,
          },
        })

        await prisma.resident.update({
          where: { id: r.id },
          data: { partyId: newParty.id },
        })
        created++
      }
    } catch (err: any) {
      console.error(`Error processing resident ${r.id} (${r.firstName} ${r.lastName}): ${err.message}`)
      skipped++
    }
  }

  console.log(`Done: linked=${linked}, created=${created}, skipped=${skipped}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
