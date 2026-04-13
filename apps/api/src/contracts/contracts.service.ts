import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async list(
    user: AuthUser,
    query: { status?: string; propertyId?: string; search?: string },
  ) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: any = { tenantId: user.tenantId, ...scopeWhere }

    if (query.status && query.status !== 'all') {
      where.status = query.status
    }
    if (query.propertyId) {
      where.propertyId = query.propertyId
    }
    if (query.search) {
      where.OR = [
        { contractNumber: { contains: query.search, mode: 'insensitive' } },
        { resident: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { resident: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const items = await this.prisma.leaseAgreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, area: true } },
        resident: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    })

    return items.map((i) => ({
      ...i,
      monthlyRent: Number(i.monthlyRent),
      deposit: i.deposit ? Number(i.deposit) : null,
      depositPaid: i.depositPaid ? Number(i.depositPaid) : null,
      startDate: i.startDate.toISOString(),
      endDate: i.endDate?.toISOString() ?? null,
      terminatedAt: i.terminatedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }))
  }

  async getStats(user: AuthUser, propertyId?: string) {
    const tenantId = user.tenantId
    let scopeWhere: Record<string, unknown>
    if (propertyId) {
      await this.scope.verifyPropertyAccess(user, propertyId)
      scopeWhere = { propertyId }
    } else {
      scopeWhere = await this.scope.scopeByPropertyId(user)
    }
    const base = { tenantId, ...scopeWhere }
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [total, active, terminated, expiringSoon, rentAgg] = await Promise.all([
      this.prisma.leaseAgreement.count({ where: base as any }),
      this.prisma.leaseAgreement.count({ where: { ...base, status: 'aktivni' } as any }),
      this.prisma.leaseAgreement.count({ where: { ...base, status: 'ukoncena' } as any }),
      this.prisma.leaseAgreement.count({
        where: {
          ...base,
          status: 'aktivni',
          indefinite: false,
          endDate: { lte: thirtyDaysLater, gte: now },
        } as any,
      }),
      this.prisma.leaseAgreement.aggregate({
        where: { ...base, status: 'aktivni' } as any,
        _sum: { monthlyRent: true },
      }),
    ])

    return {
      total,
      active,
      terminated,
      expiringSoon,
      monthlyRentTotal: Number(rentAgg._sum.monthlyRent ?? 0),
    }
  }

  async getById(user: AuthUser, id: string) {
    const item = await this.prisma.leaseAgreement.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, name: true, area: true, floor: true } },
        resident: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    })

    if (!item) throw new NotFoundException('Smlouva nenalezena')
    await this.scope.verifyPropertyAccess(user, item.propertyId)

    return {
      ...item,
      monthlyRent: Number(item.monthlyRent),
      deposit: item.deposit ? Number(item.deposit) : null,
      depositPaid: item.depositPaid ? Number(item.depositPaid) : null,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate?.toISOString() ?? null,
      terminatedAt: item.terminatedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }
  }

  async create(user: AuthUser, dto: {
    propertyId: string
    unitId?: string
    residentId?: string
    contractType?: string
    monthlyRent: number
    deposit?: number
    startDate: string
    endDate?: string
    indefinite?: boolean
    noticePeriod?: number
    renewalType?: string
    note?: string
  }) {
    await this.scope.verifyPropertyAccess(user, dto.propertyId)

    // Generate contract number
    const year = new Date().getFullYear()
    const count = await this.prisma.leaseAgreement.count({
      where: { tenantId: user.tenantId },
    })
    const contractNumber = `NS-${year}-${String(count + 1).padStart(3, '0')}`

    const item = await this.prisma.leaseAgreement.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        residentId: dto.residentId,
        contractNumber,
        contractType: (dto.contractType as any) ?? 'najem',
        monthlyRent: dto.monthlyRent,
        deposit: dto.deposit,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        indefinite: dto.indefinite ?? !dto.endDate,
        noticePeriod: dto.noticePeriod ?? 3,
        renewalType: (dto.renewalType as any) ?? 'pisemna',
        note: dto.note,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, area: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return {
      ...item,
      monthlyRent: Number(item.monthlyRent),
      deposit: item.deposit ? Number(item.deposit) : null,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }
  }

  async update(user: AuthUser, id: string, dto: {
    propertyId?: string
    unitId?: string
    residentId?: string
    contractType?: string
    monthlyRent?: number
    deposit?: number
    startDate?: string
    endDate?: string
    indefinite?: boolean
    noticePeriod?: number
    renewalType?: string
    note?: string
    status?: string
  }) {
    await this.getById(user, id)

    const data: any = {}
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId
    if (dto.unitId !== undefined) data.unitId = dto.unitId
    if (dto.residentId !== undefined) data.residentId = dto.residentId
    if (dto.contractType !== undefined) data.contractType = dto.contractType
    if (dto.monthlyRent !== undefined) data.monthlyRent = dto.monthlyRent
    if (dto.deposit !== undefined) data.deposit = dto.deposit
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.indefinite !== undefined) data.indefinite = dto.indefinite
    if (dto.noticePeriod !== undefined) data.noticePeriod = dto.noticePeriod
    if (dto.renewalType !== undefined) data.renewalType = dto.renewalType
    if (dto.note !== undefined) data.note = dto.note
    if (dto.status !== undefined) data.status = dto.status

    const item = await this.prisma.leaseAgreement.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, area: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return {
      ...item,
      monthlyRent: Number(item.monthlyRent),
      deposit: item.deposit ? Number(item.deposit) : null,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate?.toISOString() ?? null,
      terminatedAt: item.terminatedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }
  }

  async terminate(
    user: AuthUser,
    id: string,
    dto: { terminatedAt?: string; terminationNote?: string },
  ) {
    await this.getById(user, id)

    const terminatedAt = dto.terminatedAt ? new Date(dto.terminatedAt) : new Date()

    const item = await this.prisma.leaseAgreement.update({
      where: { id },
      data: {
        status: 'ukoncena',
        terminatedAt,
        terminationNote: dto.terminationNote,
        endDate: terminatedAt,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return {
      ...item,
      monthlyRent: Number(item.monthlyRent),
      deposit: item.deposit ? Number(item.deposit) : null,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate?.toISOString() ?? null,
      terminatedAt: item.terminatedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id)
    await this.prisma.leaseAgreement.delete({ where: { id } })
    return { success: true }
  }
}
