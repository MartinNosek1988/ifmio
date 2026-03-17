import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateTenancyDto } from './dto/create-tenancy.dto'
import type { UpdateTenancyDto } from './dto/update-tenancy.dto'
import type { TenancyType, TenancyRole } from '@prisma/client'

const PARTY_SELECT = { id: true, displayName: true, type: true, phone: true, email: true }

@Injectable()
export class TenancyService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTenancyDto) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId },
      include: { property: { select: { tenantId: true } } },
    })
    if (!unit || unit.property.tenantId !== tenantId) throw new NotFoundException('Jednotka nenalezena')

    const party = await this.prisma.party.findFirst({ where: { id: dto.partyId, tenantId } })
    if (!party) throw new NotFoundException('Subjekt nenalezen')

    // Overlap validation: no two active tenants on same unit
    if (dto.type === 'lease' || dto.type === 'sublease') {
      const role = dto.role ?? 'tenant'
      if (role === 'tenant') {
        const activeTenancy = await this.prisma.tenancy.findFirst({
          where: { unitId: dto.unitId, tenantId, isActive: true, role: 'tenant', type: { in: ['lease', 'sublease'] } },
        })
        if (activeTenancy) {
          throw new ConflictException('Na této jednotce již existuje aktivní nájemce. Nejdříve ukončete stávající nájem.')
        }
      }
    }

    return this.prisma.tenancy.create({
      data: {
        tenantId,
        unitId: dto.unitId,
        partyId: dto.partyId,
        type: dto.type as TenancyType,
        role: (dto.role ?? 'tenant') as TenancyRole,
        contractNo: dto.contractNo,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        rentAmount: dto.rentAmount,
        serviceAdvanceAmount: dto.serviceAdvanceAmount,
        depositAmount: dto.depositAmount,
        note: dto.note,
      },
      include: {
        party: { select: PARTY_SELECT },
        unit: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
      },
    })
  }

  async findByUnit(tenantId: string, unitId: string) {
    return this.prisma.tenancy.findMany({
      where: { tenantId, unitId },
      include: { party: { select: PARTY_SELECT } },
      orderBy: { validFrom: 'desc' },
    })
  }

  async findByProperty(tenantId: string, propertyId: string, includeInactive = false) {
    return this.prisma.tenancy.findMany({
      where: {
        tenantId,
        unit: { propertyId },
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        unit: { select: { id: true, name: true } },
        party: { select: PARTY_SELECT },
      },
      orderBy: { validFrom: 'desc' },
    })
  }

  async findByParty(tenantId: string, partyId: string) {
    return this.prisma.tenancy.findMany({
      where: { tenantId, partyId },
      include: {
        unit: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
        party: { select: PARTY_SELECT },
      },
      orderBy: { validFrom: 'desc' },
    })
  }

  async findOne(tenantId: string, id: string) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: { id, tenantId },
      include: {
        unit: { include: { property: true } },
        party: true,
      },
    })
    if (!tenancy) throw new NotFoundException('Nájem nenalezen')
    return tenancy
  }

  async update(tenantId: string, id: string, dto: UpdateTenancyDto) {
    const existing = await this.prisma.tenancy.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Nájem nenalezen')

    const data: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        if (['validFrom', 'validTo', 'moveInDate', 'moveOutDate'].includes(key)) {
          data[key] = val ? new Date(val as string) : null
        } else {
          data[key] = val
        }
      }
    }

    return this.prisma.tenancy.update({
      where: { id },
      data,
      include: {
        party: { select: PARTY_SELECT },
        unit: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
      },
    })
  }

  async terminate(tenantId: string, id: string, moveOutDate: Date) {
    const existing = await this.prisma.tenancy.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Nájem nenalezen')
    if (!existing.isActive) throw new ConflictException('Nájem je již ukončen')

    return this.prisma.tenancy.update({
      where: { id },
      data: { isActive: false, validTo: moveOutDate, moveOutDate },
      include: {
        party: { select: PARTY_SELECT },
        unit: { select: { id: true, name: true } },
      },
    })
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.tenancy.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Nájem nenalezen')
    await this.prisma.tenancy.update({ where: { id }, data: { isActive: false } })
  }
}
