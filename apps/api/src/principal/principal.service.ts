import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreatePrincipalDto } from './dto/create-principal.dto'
import type { UpdatePrincipalDto } from './dto/update-principal.dto'
import type { PrincipalQueryDto } from './dto/principal-query.dto'
import type { PrincipalType } from '@prisma/client'

@Injectable()
export class PrincipalService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePrincipalDto) {
    const party = await this.prisma.party.findFirst({
      where: { id: dto.partyId, tenantId },
    })
    if (!party) throw new NotFoundException('Subjekt nenalezen')

    if (dto.code) {
      const existing = await this.prisma.principal.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      })
      if (existing) throw new ConflictException(`Principál s kódem "${dto.code}" již existuje`)
    }

    return this.prisma.principal.create({
      data: {
        tenantId,
        partyId: dto.partyId,
        type: dto.type as PrincipalType,
        code: dto.code,
        displayName: dto.displayName,
        isActive: dto.isActive ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        note: dto.note,
      },
      include: { party: { select: { id: true, displayName: true, type: true, ic: true } } },
    })
  }

  async findAll(tenantId: string, query: PrincipalQueryDto) {
    const page = Math.max(1, query.page || 1)
    const limit = Math.min(100, Math.max(1, query.limit || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId }
    if (query.type) where.type = query.type
    if (query.isActive !== undefined) where.isActive = query.isActive
    else where.isActive = true

    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.principal.findMany({
        where,
        orderBy: { displayName: 'asc' },
        take: limit,
        skip,
        include: {
          party: { select: { id: true, displayName: true, type: true, ic: true } },
          _count: { select: { managementContracts: true } },
        },
      }),
      this.prisma.principal.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(tenantId: string, id: string) {
    const principal = await this.prisma.principal.findFirst({
      where: { id, tenantId },
      include: {
        party: true,
        owners: { include: { party: { select: { id: true, displayName: true, type: true } } } },
        managementContracts: {
          include: { property: { select: { id: true, name: true, address: true } } },
          orderBy: { createdAt: 'desc' },
        },
        financialContexts: {
          select: { id: true, displayName: true, code: true, scopeType: true, isActive: true },
        },
      },
    })
    if (!principal) throw new NotFoundException('Principál nenalezen')
    return principal
  }

  async update(tenantId: string, id: string, dto: UpdatePrincipalDto) {
    const existing = await this.prisma.principal.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Principál nenalezen')

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.principal.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      })
      if (dup && dup.id !== id) throw new ConflictException(`Kód "${dto.code}" je již použit`)
    }

    const data: Record<string, unknown> = {}
    if (dto.type !== undefined) data.type = dto.type
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.code !== undefined) data.code = dto.code
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.validFrom !== undefined) data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null
    if (dto.validTo !== undefined) data.validTo = dto.validTo ? new Date(dto.validTo) : null
    if (dto.note !== undefined) data.note = dto.note

    return this.prisma.principal.update({
      where: { id },
      data,
      include: { party: { select: { id: true, displayName: true, type: true, ic: true } } },
    })
  }

  async remove(tenantId: string, id: string) {
    const principal = await this.prisma.principal.findFirst({ where: { id, tenantId } })
    if (!principal) throw new NotFoundException('Principál nenalezen')

    const activeContracts = await this.prisma.managementContract.count({
      where: { principalId: id, isActive: true },
    })
    if (activeContracts > 0) {
      throw new ConflictException('Nelze deaktivovat principála s aktivními smlouvami')
    }

    await this.prisma.principal.update({ where: { id }, data: { isActive: false } })
  }

  async getProperties(tenantId: string, principalId: string) {
    await this.verifyAccess(tenantId, principalId)

    const contracts = await this.prisma.managementContract.findMany({
      where: { tenantId, principalId, isActive: true },
      select: { propertyId: true },
    })
    const propertyIds = [...new Set(contracts.map(c => c.propertyId))]

    return this.prisma.property.findMany({
      where: { id: { in: propertyIds }, tenantId },
      include: { _count: { select: { units: true, residents: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async getUnits(tenantId: string, principalId: string) {
    await this.verifyAccess(tenantId, principalId)

    const contracts = await this.prisma.managementContract.findMany({
      where: { tenantId, principalId, isActive: true },
      include: {
        property: { select: { id: true, name: true } },
        units: { select: { unitId: true } },
      },
    })

    const unitIds: string[] = []
    const wholePropertyIds: string[] = []

    for (const c of contracts) {
      if (c.scope === 'whole_property') {
        wholePropertyIds.push(c.propertyId)
      } else {
        unitIds.push(...c.units.map(u => u.unitId))
      }
    }

    return this.prisma.unit.findMany({
      where: {
        OR: [
          ...(wholePropertyIds.length > 0 ? [{ propertyId: { in: wholePropertyIds } }] : []),
          ...(unitIds.length > 0 ? [{ id: { in: unitIds } }] : []),
        ],
      },
      include: {
        property: { select: { id: true, name: true } },
        tenancies: {
          where: { isActive: true, tenantId },
          include: { party: { select: { id: true, displayName: true } } },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async getTenants(tenantId: string, principalId: string) {
    await this.verifyAccess(tenantId, principalId)

    // Get all units of this principal first
    const units = await this.getUnits(tenantId, principalId)
    const unitIds = units.map(u => u.id)

    return this.prisma.tenancy.findMany({
      where: { tenantId, unitId: { in: unitIds }, isActive: true },
      include: {
        unit: {
          select: {
            id: true, name: true,
            property: { select: { id: true, name: true } },
          },
        },
        party: { select: { id: true, displayName: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  private async verifyAccess(tenantId: string, principalId: string) {
    const p = await this.prisma.principal.findFirst({ where: { id: principalId, tenantId } })
    if (!p) throw new NotFoundException('Principál nenalezen')
    return p
  }
}
