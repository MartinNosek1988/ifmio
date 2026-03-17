import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreatePartyDto } from './dto/create-party.dto'
import type { UpdatePartyDto } from './dto/update-party.dto'
import type { PartyQueryDto } from './dto/party-query.dto'
import type { PartyType } from '@prisma/client'

@Injectable()
export class PartyService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePartyDto) {
    if (dto.ic) {
      const existing = await this.prisma.party.findFirst({
        where: { tenantId, ic: dto.ic, isActive: true },
      })
      if (existing) throw new ConflictException(`Subjekt s IČ ${dto.ic} již existuje`)
    }

    return this.prisma.party.create({
      data: {
        tenantId,
        type: dto.type as PartyType,
        displayName: dto.displayName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        companyName: dto.companyName,
        ic: dto.ic,
        dic: dto.dic,
        vatId: dto.vatId,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        street: dto.street,
        street2: dto.street2,
        city: dto.city,
        postalCode: dto.postalCode,
        countryCode: dto.countryCode,
        dataBoxId: dto.dataBoxId,
        bankAccount: dto.bankAccount,
        bankCode: dto.bankCode,
        iban: dto.iban,
        note: dto.note,
      },
    })
  }

  async findAll(tenantId: string, query: PartyQueryDto) {
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
        { ic: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        orderBy: { displayName: 'asc' },
        take: limit,
        skip,
        include: { _count: { select: { principals: true } } },
      }),
      this.prisma.party.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(tenantId: string, id: string) {
    const party = await this.prisma.party.findFirst({
      where: { id, tenantId },
      include: {
        principals: {
          include: { _count: { select: { managementContracts: true } } },
        },
      },
    })
    if (!party) throw new NotFoundException('Subjekt nenalezen')
    return party
  }

  async update(tenantId: string, id: string, dto: UpdatePartyDto) {
    const existing = await this.prisma.party.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Subjekt nenalezen')

    if (dto.ic && dto.ic !== existing.ic) {
      const dup = await this.prisma.party.findFirst({
        where: { tenantId, ic: dto.ic, isActive: true, id: { not: id } },
      })
      if (dup) throw new ConflictException(`Subjekt s IČ ${dto.ic} již existuje`)
    }

    const data: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) data[key] = val
    }

    return this.prisma.party.update({ where: { id }, data })
  }

  async remove(tenantId: string, id: string) {
    const party = await this.prisma.party.findFirst({ where: { id, tenantId } })
    if (!party) throw new NotFoundException('Subjekt nenalezen')

    const principalCount = await this.prisma.principal.count({
      where: { partyId: id, isActive: true },
    })
    if (principalCount > 0) {
      throw new ConflictException('Nelze deaktivovat subjekt s aktivními principály')
    }

    await this.prisma.party.update({ where: { id }, data: { isActive: false } })
  }

  async search(tenantId: string, term: string) {
    return this.prisma.party.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { displayName: { contains: term, mode: 'insensitive' } },
          { ic: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, displayName: true, type: true, ic: true, email: true },
      take: 10,
      orderBy: { displayName: 'asc' },
    })
  }
}
