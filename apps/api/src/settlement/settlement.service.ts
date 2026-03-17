import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettlementCalcService } from './settlement-calc.service'
import type { CreateSettlementDto, AddCostDto } from './dto/create-settlement.dto'
import type { SettlementCostType, DistributionKey } from '@prisma/client'

const PENB_BASIC_PERCENT: Record<string, number> = {
  A: 60, B: 60, C: 50, D: 40, E: 40, F: 40, G: 40,
}

@Injectable()
export class SettlementService {
  constructor(
    private prisma: PrismaService,
    private calc: SettlementCalcService,
  ) {}

  async create(tenantId: string, dto: CreateSettlementDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, tenantId },
      include: { units: { select: { id: true, heatingArea: true, area: true, personCount: true, tuvArea: true } } },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    // Determine basic percent from PENB class
    const basicPct = dto.heatingBasicPercent
      ?? (dto.buildingEnergyClass ? PENB_BASIC_PERCENT[dto.buildingEnergyClass.toUpperCase()] ?? 50 : 50)

    const settlement = await this.prisma.settlement.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        financialContextId: dto.financialContextId,
        billingPeriodId: dto.billingPeriodId,
        name: dto.name,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        heatingBasicPercent: basicPct,
        buildingEnergyClass: dto.buildingEnergyClass,
        note: dto.note,
      },
    })

    // Auto-create SettlementItem for each unit
    for (const unit of property.units) {
      await this.prisma.settlementItem.create({
        data: {
          settlementId: settlement.id,
          unitId: unit.id,
          heatedArea: unit.heatingArea ?? unit.area ?? 0,
          personCount: unit.personCount ?? 1,
        },
      })
    }

    return this.findOne(tenantId, settlement.id)
  }

  async findAll(tenantId: string, query?: { propertyId?: string; status?: string; year?: string }) {
    const where: Record<string, unknown> = { tenantId }
    if (query?.propertyId) where.propertyId = query.propertyId
    if (query?.status) where.status = query.status
    if (query?.year) {
      const y = parseInt(query.year)
      where.periodFrom = { gte: new Date(y, 0, 1) }
      where.periodTo = { lte: new Date(y, 11, 31, 23, 59, 59) }
    }

    return this.prisma.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        _count: { select: { items: true, costEntries: true } },
      },
    })
  }

  async findOne(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id, tenantId },
      include: {
        property: { select: { id: true, name: true, address: true, city: true } },
        costEntries: { orderBy: { createdAt: 'asc' } },
        items: {
          include: { unit: { select: { id: true, name: true, floor: true, area: true } } },
          orderBy: { unit: { name: 'asc' } },
        },
      },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')
    return settlement
  }

  async addCost(tenantId: string, settlementId: string, dto: AddCostDto) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id: settlementId, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    return this.prisma.settlementCost.create({
      data: {
        settlementId,
        costType: dto.costType as SettlementCostType,
        name: dto.name,
        totalAmount: dto.totalAmount,
        invoiceId: dto.invoiceId,
        distributionKey: dto.distributionKey as DistributionKey,
        basicPercent: dto.basicPercent,
      },
    })
  }

  async removeCost(tenantId: string, costId: string) {
    const cost = await this.prisma.settlementCost.findUnique({
      where: { id: costId },
      include: { settlement: { select: { tenantId: true } } },
    })
    if (!cost || cost.settlement.tenantId !== tenantId) throw new NotFoundException('Nákladová položka nenalezena')
    await this.prisma.settlementCost.delete({ where: { id: costId } })
  }

  async calculate(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    await this.calc.calculate(id)
    return this.findOne(tenantId, id)
  }

  async approve(tenantId: string, id: string, userId: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'approved', approvedAt: new Date(), approvedBy: userId },
    })
  }

  async getUnitDetail(tenantId: string, settlementId: string, unitId: string) {
    const item = await this.prisma.settlementItem.findUnique({
      where: { settlementId_unitId: { settlementId, unitId } },
      include: {
        unit: { select: { id: true, name: true, floor: true, area: true, heatingArea: true, personCount: true } },
        settlement: { select: { tenantId: true, name: true, periodFrom: true, periodTo: true } },
      },
    })
    if (!item || item.settlement.tenantId !== tenantId) throw new NotFoundException('Položka vyúčtování nenalezena')
    return item
  }
}
