import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class E2eSeedService {
  constructor(private prisma: PrismaService) {}

  async setup() {
    const slug = `e2e-test-${Date.now()}`

    return this.prisma.$transaction(async (tx) => {
      // 1. Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: 'E2E Test Tenant',
          slug,
          plan: 'free',
        },
      })

      // 2. User (needed for auth in E2E tests)
      const passwordHash = await bcrypt.hash('E2eTestPass123!', 12)
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: `e2e-${Date.now()}@test.ifmio.dev`,
          name: 'E2E Test User',
          passwordHash,
          role: 'tenant_owner',
        },
      })

      // 3. Property
      const property = await tx.property.create({
        data: {
          tenantId: tenant.id,
          name: 'Testovací SVJ Lipová',
          address: 'Lipová 42',
          city: 'Praha',
          postalCode: '11000',
          type: 'bytdum',
          ownership: 'vlastnictvi',
          legalMode: 'SVJ',
        },
      })

      // 4. Units
      const unit1 = await tx.unit.create({
        data: { propertyId: property.id, name: 'Byt 1', floor: 1, area: 55.0, spaceType: 'RESIDENTIAL', knDesignation: '42/1' },
      })
      const unit2 = await tx.unit.create({
        data: { propertyId: property.id, name: 'Byt 2', floor: 2, area: 72.0, spaceType: 'RESIDENTIAL', knDesignation: '42/2' },
      })
      const unit3 = await tx.unit.create({
        data: { propertyId: property.id, name: 'Garáž 1', floor: 0, area: 18.0, spaceType: 'GARAGE', knDesignation: '42/3' },
      })

      // 5. Parties
      const party1 = await tx.party.create({
        data: {
          tenantId: tenant.id,
          type: 'person',
          displayName: 'Jan Novák',
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@test.cz',
        },
      })
      const party2 = await tx.party.create({
        data: {
          tenantId: tenant.id,
          type: 'company',
          displayName: 'Správa Lipová s.r.o.',
          companyName: 'Správa Lipová s.r.o.',
          ic: '12345678',
        },
      })

      // 6. UnitOwnerships
      await tx.unitOwnership.create({
        data: {
          tenantId: tenant.id,
          unitId: unit1.id,
          partyId: party1.id,
          role: 'legal_owner',
          shareNumerator: 55,
          shareDenominator: 145,
          isActive: true,
        },
      })
      await tx.unitOwnership.create({
        data: {
          tenantId: tenant.id,
          unitId: unit2.id,
          partyId: party2.id,
          role: 'legal_owner',
          shareNumerator: 72,
          shareDenominator: 145,
          isActive: true,
        },
      })

      // 7. Meter
      const meter = await tx.meter.create({
        data: {
          tenantId: tenant.id,
          propertyId: property.id,
          unitId: unit1.id,
          name: 'Vodoměr SV - Byt 1',
          serialNumber: 'E2E-VOD-001',
          meterType: 'voda_studena',
          unit: 'm³',
          isActive: true,
        },
      })

      return {
        tenantId: tenant.id,
        userId: user.id,
        userEmail: user.email,
        propertyId: property.id,
        unitIds: [unit1.id, unit2.id, unit3.id],
        partyIds: [party1.id, party2.id],
        meterId: meter.id,
        message: 'E2E seed data created successfully',
      }
    })
  }

  async cleanup(tenantId: string) {
    // Cascade delete — Tenant has onDelete: Cascade on most relations
    // Delete tenant → cascades to properties, units, parties, etc.
    await this.prisma.tenant.delete({
      where: { id: tenantId },
    })

    return {
      tenantId,
      deleted: true,
      message: 'E2E test data cleaned up',
    }
  }
}
