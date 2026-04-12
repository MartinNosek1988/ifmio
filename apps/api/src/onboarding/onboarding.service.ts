import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { OnboardingStep1Dto, OnboardingStep2Dto, OnboardingStep3Dto, OnboardingStep4Dto } from './dto/onboarding.dto'
import type { TenantArchetype, PrincipalType, ManagementType, PropertyType, OwnershipType } from '@prisma/client'
import { randomBytes } from 'crypto'

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name)

  constructor(private prisma: PrismaService) {}

  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        archetype: true,
        subjectType: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    })

    if (!tenant) return null

    // Role, které nepotřebují property onboarding wizard
    const skipTypes = ['najemnik', 'dodavatel', 'vlastnik_jednotky']
    if (tenant.subjectType && skipTypes.includes(tenant.subjectType)) {
      return {
        archetype: null,
        onboardingCompleted: true,
        onboardingStep: tenant.onboardingStep,
      }
    }

    // Fallback: explicit archetype má přednost, jinak mapujeme ze subjectType
    const archetype = tenant.archetype ?? this.resolveArchetype(tenant.subjectType)

    return {
      archetype,
      onboardingCompleted: tenant.onboardingCompleted,
      onboardingStep: tenant.onboardingStep,
    }
  }

  private resolveArchetype(subjectType: string | null | undefined): string | null {
    if (!subjectType) return null
    const map: Record<string, string> = {
      svj_bd: 'SELF_MANAGED_HOA',
      spravce: 'MANAGEMENT_COMPANY',
      vlastnik_domu: 'RENTAL_OWNER',
    }
    return map[subjectType] ?? null
  }

  async completeStep1(tenantId: string, dto: OnboardingStep1Dto) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { archetype: dto.archetype as TenantArchetype, onboardingStep: 1 },
    })
    return { step: 1, completed: true }
  }

  async completeStep2(tenantId: string, dto: OnboardingStep2Dto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic claim inside transaction
      const claim = await tx.tenant.updateMany({
        where: { id: tenantId, onboardingStep: 1 },
        data: { onboardingStep: 2 },
      })
      if (claim.count === 0) {
        throw new BadRequestException('Krok 2 již byl dokončen nebo nebyl dokončen krok 1')
      }

      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { archetype: true },
      })

      const party = await tx.party.create({
        data: {
          tenantId,
          type: dto.ico ? 'company' : 'organization_unit',
          displayName: dto.name,
          companyName: dto.name,
          ic: dto.ico,
          dic: dto.dic,
          pravniForma: dto.legalForm,
        },
      })

      const principalType = this.mapArchetypeToPrincipalType(tenant?.archetype)
      const codeSuffix = randomBytes(3).toString('hex')
      const principal = await tx.principal.create({
        data: {
          tenantId,
          partyId: party.id,
          type: principalType,
          code: dto.ico || `${dto.name.substring(0, 6).toUpperCase().replace(/\s+/g, '_')}_${codeSuffix}`,
          displayName: dto.name,
          isActive: true,
        },
      })

      return { principalId: principal.id, partyId: party.id }
    })

    this.logger.log(`Onboarding step 2: Party ${result.partyId} + Principal ${result.principalId} for tenant ${tenantId}`)
    return { step: 2, completed: true, ...result }
  }

  async completeStep3(tenantId: string, userId: string, dto: OnboardingStep3Dto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic claim inside transaction
      const claim = await tx.tenant.updateMany({
        where: { id: tenantId, onboardingStep: 2 },
        data: { onboardingStep: 3 },
      })
      if (claim.count === 0) {
        throw new BadRequestException('Krok 3 již byl dokončen nebo nebyl dokončen krok 2')
      }

      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { archetype: true },
      })

      const principal = await tx.principal.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      if (!principal) throw new BadRequestException('Nejdřív dokončete krok 2 (údaje subjektu)')

      const property = await tx.property.create({
        data: {
          tenantId,
          name: dto.name,
          address: dto.address,
          city: dto.city,
          postalCode: dto.postalCode,
          type: dto.type as PropertyType,
          ownership: this.mapTypeToOwnership(dto.type),
          ico: dto.ico,
          status: 'active',
        },
      })

      const contract = await tx.managementContract.create({
        data: {
          tenantId,
          principalId: principal.id,
          propertyId: property.id,
          type: this.mapArchetypeToContractType(tenant?.archetype),
          scope: 'whole_property',
          isActive: true,
        },
      })

      const fc = await tx.financialContext.create({
        data: {
          tenantId,
          principalId: principal.id,
          propertyId: property.id,
          managementContractId: contract.id,
          scopeType: 'property',
          code: dto.ico || property.id.substring(0, 8),
          displayName: dto.name,
          currency: 'CZK',
          vatEnabled: false,
          vatPayer: false,
        },
      })

      await tx.userPropertyRole.create({
        data: { tenantId, userId, propertyId: property.id, role: 'MANAGER' },
      })

      return { propertyId: property.id, contractId: contract.id, financialContextId: fc.id }
    })

    this.logger.log(`Onboarding step 3: Property ${result.propertyId} + Contract ${result.contractId} + FC ${result.financialContextId} for tenant ${tenantId}`)
    return { step: 3, completed: true, ...result }
  }

  async completeStep4(tenantId: string, dto: OnboardingStep4Dto) {
    // Compute redirect BEFORE claim (read-only, no side effects)
    const firstAction = dto.actions?.[0]
    let redirectTo = '/onboarding'

    if (firstAction) {
      const prop = await this.prisma.property.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      switch (firstAction) {
        case 'import_units':
          redirectTo = prop ? `/properties/${prop.id}?tab=units&action=import` : '/properties'
          break
        case 'add_owners': redirectTo = '/residents'; break
        case 'connect_bank': redirectTo = '/finance?tab=accounts'; break
        case 'setup_prescriptions': redirectTo = '/finance?tab=prescriptions'; break
        default: redirectTo = '/onboarding'
      }
    }

    // Atomic claim as last operation
    const claim = await this.prisma.tenant.updateMany({
      where: { id: tenantId, onboardingStep: 3 },
      data: { onboardingStep: 4, onboardingCompleted: true },
    })
    if (claim.count === 0) {
      throw new BadRequestException('Krok 4 vyžaduje dokončený krok 3')
    }

    this.logger.log(`Onboarding completed for tenant ${tenantId}, redirect: ${redirectTo}`)
    return { step: 4, completed: true, redirectTo }
  }

  private mapArchetypeToPrincipalType(archetype: string | null | undefined): PrincipalType {
    switch (archetype) {
      case 'SELF_MANAGED_HOA': return 'hoa'
      case 'MANAGEMENT_COMPANY': return 'corporate_owner'
      case 'RENTAL_OWNER': return 'individual_owner'
      default: return 'mixed_client'
    }
  }

  private mapTypeToOwnership(type: string): OwnershipType {
    switch (type) {
      case 'SVJ': return 'vlastnictvi'
      case 'BD': return 'druzstvo'
      case 'RENTAL_RESIDENTIAL':
      case 'RENTAL_MUNICIPAL': return 'pronajem'
      default: return 'vlastnictvi'
    }
  }

  private mapArchetypeToContractType(archetype: string | null | undefined): ManagementType {
    switch (archetype) {
      case 'SELF_MANAGED_HOA': return 'hoa_management'
      case 'MANAGEMENT_COMPANY': return 'rental_management'
      case 'RENTAL_OWNER': return 'rental_management'
      default: return 'hoa_management'
    }
  }
}
