import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreatePropertyOwnershipDto } from './dto/create-property-ownership.dto'
import type { UpdatePropertyOwnershipDto } from './dto/update-property-ownership.dto'
import type { CreateUnitOwnershipDto } from './dto/create-unit-ownership.dto'
import type { UpdateUnitOwnershipDto } from './dto/update-unit-ownership.dto'
import type { OwnershipRole } from '@prisma/client'

const PARTY_SELECT = { id: true, displayName: true, type: true, ic: true, email: true }

@Injectable()
export class OwnershipService {
  constructor(private prisma: PrismaService) {}

  // ─── Property Ownership ─────────────────────────────────────────

  async createPropertyOwnership(tenantId: string, dto: CreatePropertyOwnershipDto) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, tenantId } })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    const party = await this.prisma.party.findFirst({ where: { id: dto.partyId, tenantId } })
    if (!party) throw new NotFoundException('Subjekt nenalezen')

    // Validate total share doesn't exceed 100%
    if (dto.sharePercent != null) {
      const existing = await this.prisma.propertyOwnership.aggregate({
        where: { propertyId: dto.propertyId, tenantId, isActive: true },
        _sum: { sharePercent: true },
      })
      const currentTotal = Number(existing._sum.sharePercent ?? 0)
      if (currentTotal + dto.sharePercent > 100) {
        throw new BadRequestException(`Součet podílů by překročil 100% (aktuálně ${currentTotal}%)`)
      }
    }

    return this.prisma.propertyOwnership.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        partyId: dto.partyId,
        role: (dto.role ?? 'legal_owner') as OwnershipRole,
        shareNumerator: dto.shareNumerator,
        shareDenominator: dto.shareDenominator,
        sharePercent: dto.sharePercent,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        note: dto.note,
      },
      include: { party: { select: PARTY_SELECT } },
    })
  }

  async getPropertyOwnerships(tenantId: string, propertyId: string) {
    return this.prisma.propertyOwnership.findMany({
      where: { tenantId, propertyId, isActive: true },
      include: { party: { select: PARTY_SELECT } },
      orderBy: { sharePercent: 'desc' },
    })
  }

  async updatePropertyOwnership(tenantId: string, id: string, dto: UpdatePropertyOwnershipDto) {
    const existing = await this.prisma.propertyOwnership.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Vlastnictví nemovitosti nenalezeno')

    if (dto.sharePercent != null) {
      const agg = await this.prisma.propertyOwnership.aggregate({
        where: { propertyId: existing.propertyId, tenantId, isActive: true, id: { not: id } },
        _sum: { sharePercent: true },
      })
      const othersTotal = Number(agg._sum.sharePercent ?? 0)
      if (othersTotal + dto.sharePercent > 100) {
        throw new BadRequestException(`Součet podílů by překročil 100% (ostatní: ${othersTotal}%)`)
      }
    }

    const data: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        if (key === 'validFrom' || key === 'validTo') data[key] = val ? new Date(val as string) : null
        else data[key] = val
      }
    }

    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    return this.prisma.propertyOwnership.update({
      where: { id, tenantId },
      data,
      include: { party: { select: PARTY_SELECT } },
    })
  }

  async removePropertyOwnership(tenantId: string, id: string) {
    const existing = await this.prisma.propertyOwnership.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Vlastnictví nemovitosti nenalezeno')
    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    await this.prisma.propertyOwnership.update({ where: { id, tenantId }, data: { isActive: false } })
  }

  // ─── Unit Ownership ─────────────────────────────────────────────

  async createUnitOwnership(tenantId: string, dto: CreateUnitOwnershipDto) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId },
      include: { property: { select: { tenantId: true } } },
    })
    if (!unit || unit.property.tenantId !== tenantId) throw new NotFoundException('Jednotka nenalezena')

    const party = await this.prisma.party.findFirst({ where: { id: dto.partyId, tenantId } })
    if (!party) throw new NotFoundException('Subjekt nenalezen')

    if (dto.sharePercent != null) {
      const existing = await this.prisma.unitOwnership.aggregate({
        where: { unitId: dto.unitId, tenantId, isActive: true },
        _sum: { sharePercent: true },
      })
      const currentTotal = Number(existing._sum.sharePercent ?? 0)
      if (currentTotal + dto.sharePercent > 100) {
        throw new BadRequestException(`Součet podílů by překročil 100% (aktuálně ${currentTotal}%)`)
      }
    }

    return this.prisma.unitOwnership.create({
      data: {
        tenantId,
        unitId: dto.unitId,
        partyId: dto.partyId,
        role: (dto.role ?? 'legal_owner') as OwnershipRole,
        shareNumerator: dto.shareNumerator,
        shareDenominator: dto.shareDenominator,
        sharePercent: dto.sharePercent,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        note: dto.note,
      },
      include: { party: { select: PARTY_SELECT } },
    })
  }

  async getUnitOwnerships(tenantId: string, unitId: string) {
    return this.prisma.unitOwnership.findMany({
      where: { tenantId, unitId, isActive: true },
      include: { party: { select: PARTY_SELECT } },
      orderBy: { validFrom: 'desc' },
    })
  }

  async getUnitOwnershipsByProperty(tenantId: string, propertyId: string) {
    return this.prisma.unitOwnership.findMany({
      where: { tenantId, isActive: true, unit: { propertyId } },
      include: {
        unit: { select: { id: true, name: true } },
        party: { select: PARTY_SELECT },
      },
      orderBy: [{ unit: { name: 'asc' } }, { sharePercent: 'desc' }],
    })
  }

  async updateUnitOwnership(tenantId: string, id: string, dto: UpdateUnitOwnershipDto) {
    const existing = await this.prisma.unitOwnership.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Vlastnictví jednotky nenalezeno')

    if (dto.sharePercent != null) {
      const agg = await this.prisma.unitOwnership.aggregate({
        where: { unitId: existing.unitId, tenantId, isActive: true, id: { not: id } },
        _sum: { sharePercent: true },
      })
      const othersTotal = Number(agg._sum.sharePercent ?? 0)
      if (othersTotal + dto.sharePercent > 100) {
        throw new BadRequestException(`Součet podílů by překročil 100% (ostatní: ${othersTotal}%)`)
      }
    }

    const data: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        if (key === 'validFrom' || key === 'validTo') data[key] = val ? new Date(val as string) : null
        else data[key] = val
      }
    }

    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    return this.prisma.unitOwnership.update({
      where: { id, tenantId },
      data,
      include: { party: { select: PARTY_SELECT } },
    })
  }

  async removeUnitOwnership(tenantId: string, id: string) {
    const existing = await this.prisma.unitOwnership.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Vlastnictví jednotky nenalezeno')
    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    await this.prisma.unitOwnership.update({ where: { id, tenantId }, data: { isActive: false } })
  }
}
