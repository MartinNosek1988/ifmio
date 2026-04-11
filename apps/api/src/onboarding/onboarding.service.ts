import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { OnboardingStep1Dto, OnboardingStep2Dto, OnboardingStep3Dto, OnboardingStep4Dto } from './dto/onboarding.dto'
import type { TenantArchetype, PrincipalType, ManagementType, PropertyType, OwnershipType } from '@prisma/client'

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name)

  constructor(private prisma: PrismaService) {}

  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true, onboardingCompleted: true, onboardingStep: true },
    })
    return tenant
  }

  async completeStep1(tenantId: string, dto: OnboardingStep1Dto) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { archetype: dto.archetype as TenantArchetype, onboardingStep: 1 },
    })
    return { step: 1, completed: true }
  }

  async completeStep2(tenantId: string, dto: OnboardingStep2Dto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true },
    })

    // Create Party
    const party = await this.prisma.party.create({
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

    // Create Principal
    const principalType = this.mapArchetypeToPrincipalType(tenant?.archetype)
    const principal = await this.prisma.principal.create({
      data: {
        tenantId,
        partyId: party.id,
        type: principalType,
        code: dto.ico || dto.name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
        displayName: dto.name,
        isActive: true,
      },
    })

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: 2 },
    })

    this.logger.log(`Onboarding step 2: created Party ${party.id} + Principal ${principal.id} for tenant ${tenantId}`)
    return { step: 2, completed: true, principalId: principal.id, partyId: party.id }
  }

  async completeStep3(tenantId: string, userId: string, dto: OnboardingStep3Dto) {
    // Find Principal created in step 2
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!principal) throw new BadRequestException('Nejdřív dokončete krok 2 (údaje subjektu)')

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true },
    })

    // Create Property
    const property = await this.prisma.property.create({
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

    // Auto-create ManagementContract
    const contract = await this.prisma.managementContract.create({
      data: {
        tenantId,
        principalId: principal.id,
        propertyId: property.id,
        type: this.mapArchetypeToContractType(tenant?.archetype),
        scope: 'whole_property',
        isActive: true,
      },
    })

    // Auto-create FinancialContext
    const fc = await this.prisma.financialContext.create({
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

    // Assign user to property
    await this.prisma.userPropertyRole.create({
      data: { tenantId, userId, propertyId: property.id, role: 'MANAGER' },
    })

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: 3 },
    })

    this.logger.log(`Onboarding step 3: created Property ${property.id} + Contract ${contract.id} + FC ${fc.id} for tenant ${tenantId}`)
    return { step: 3, completed: true, propertyId: property.id, contractId: contract.id, financialContextId: fc.id }
  }

  async completeStep4(tenantId: string, dto: OnboardingStep4Dto) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: 4, onboardingCompleted: true },
    })

    // Determine redirect based on first action
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
        case 'add_owners':
          redirectTo = '/residents'
          break
        case 'connect_bank':
          redirectTo = '/finance?tab=accounts'
          break
        case 'setup_prescriptions':
          redirectTo = '/finance?tab=prescriptions'
          break
        default:
          redirectTo = '/onboarding'
      }
    }

    this.logger.log(`Onboarding completed for tenant ${tenantId}, redirect: ${redirectTo}`)
    return { step: 4, completed: true, redirectTo }
  }

  // ── Helpers ──────────────────────────────────────────

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
