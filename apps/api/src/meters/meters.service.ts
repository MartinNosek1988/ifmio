import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types';

function serializeMeter(item: any) {
  return {
    ...item,
    lastReading: item.lastReading != null ? Number(item.lastReading) : null,
    installDate: item.installDate?.toISOString() ?? null,
    calibrationDate: item.calibrationDate?.toISOString() ?? null,
    calibrationDue: item.calibrationDue?.toISOString() ?? null,
    lastReadingDate: item.lastReadingDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    readings: item.readings?.map(serializeReading) ?? [],
  }
}

function serializeReading(r: any) {
  return {
    ...r,
    value: Number(r.value),
    consumption: r.consumption != null ? Number(r.consumption) : null,
    readingDate: r.readingDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}

@Injectable()
export class MetersService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async list(user: AuthUser, query: { meterType?: string; propertyId?: string; search?: string }) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: any = { tenantId: user.tenantId, ...scopeWhere }

    if (query.meterType && query.meterType !== 'all') where.meterType = query.meterType
    if (query.propertyId) where.propertyId = query.propertyId
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const items = await this.prisma.meter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        unitRel: { select: { id: true, name: true, area: true } },
        readings: { orderBy: { readingDate: 'desc' }, take: 2 },
        parentMeter: { select: { id: true, name: true, serialNumber: true } },
        _count: { select: { childMeters: true } },
      },
    })

    return items.map(serializeMeter)
  }

  async getStats(user: AuthUser) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const base = { tenantId, isActive: true, ...scopeWhere }
    const now = new Date()

    const [total, elektrina, vodaStudena, vodaTepla, plyn, teplo, calibrationDue] = await Promise.all([
      this.prisma.meter.count({ where: base as any }),
      this.prisma.meter.count({ where: { ...base, meterType: 'elektrina' } as any }),
      this.prisma.meter.count({ where: { ...base, meterType: 'voda_studena' } as any }),
      this.prisma.meter.count({ where: { ...base, meterType: 'voda_tepla' } as any }),
      this.prisma.meter.count({ where: { ...base, meterType: 'plyn' } as any }),
      this.prisma.meter.count({ where: { ...base, meterType: 'teplo' } as any }),
      this.prisma.meter.count({
        where: { ...base, calibrationDue: { lt: now } } as any,
      }),
    ])

    return { total, elektrina, vodaStudena, vodaTepla, plyn, teplo, calibrationDue }
  }

  async getById(user: AuthUser, id: string) {
    const item = await this.prisma.meter.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unitRel: { select: { id: true, name: true, area: true, floor: true } },
        readings: { orderBy: { readingDate: 'desc' } },
        parentMeter: { select: { id: true, name: true, serialNumber: true, meterType: true } },
        childMeters: {
          select: { id: true, name: true, serialNumber: true, unitId: true, lastReading: true, lastReadingDate: true },
          orderBy: { name: 'asc' },
        },
      },
    })
    if (!item) throw new NotFoundException('Měřidlo nenalezeno')
    await this.scope.verifyEntityAccess(user, item.propertyId)
    return serializeMeter(item)
  }

  /**
   * Ověří platnost parentMeterId pro create/update.
   * Pravidla: parent existuje v témž tenantu, ve stejné property,
   * stejný meterType, max 1 úroveň hloubky (parent nemá vlastního parenta),
   * při updatu nesmí být parent === sám sobě.
   */
  private async validateParentMeter(
    user: AuthUser,
    parentMeterId: string,
    childPropertyId: string | null | undefined,
    childMeterType: string,
    childMeterId?: string,
  ) {
    if (childMeterId && parentMeterId === childMeterId) {
      throw new BadRequestException('Měřidlo nemůže být parent samo sobě')
    }
    const parent = await this.prisma.meter.findFirst({
      where: { id: parentMeterId, tenantId: user.tenantId },
      select: { id: true, propertyId: true, parentMeterId: true, meterType: true },
    })
    if (!parent) throw new NotFoundException('Patní (parent) měřidlo nenalezeno')
    await this.scope.verifyEntityAccess(user, parent.propertyId)
    if (parent.parentMeterId) {
      throw new BadRequestException('Měřidla lze hierarchizovat jen do jedné úrovně (parent → child)')
    }
    if (childPropertyId && parent.propertyId !== childPropertyId) {
      throw new BadRequestException('Patní měřidlo musí být ve stejné nemovitosti')
    }
    if (parent.meterType !== childMeterType) {
      throw new BadRequestException('Patní a podružné měřidlo musí mít stejný meterType')
    }
  }

  async create(user: AuthUser, dto: {
    name: string
    serialNumber: string
    meterType?: string
    unit?: string
    propertyId?: string
    unitId?: string
    parentMeterId?: string
    installDate?: string
    calibrationDue?: string
    manufacturer?: string
    location?: string
    note?: string
  }) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const meterType = (dto.meterType as any) ?? 'elektrina'
    if (dto.parentMeterId) {
      await this.validateParentMeter(user, dto.parentMeterId, dto.propertyId ?? null, meterType)
    }
    const item = await this.prisma.meter.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        serialNumber: dto.serialNumber,
        meterType,
        unit: dto.unit ?? 'kWh',
        propertyId: dto.propertyId || null,
        unitId: dto.unitId || null,
        parentMeterId: dto.parentMeterId || null,
        installDate: dto.installDate ? new Date(dto.installDate) : null,
        calibrationDue: dto.calibrationDue ? new Date(dto.calibrationDue) : null,
        manufacturer: dto.manufacturer,
        location: dto.location,
        note: dto.note,
      },
      include: {
        property: { select: { id: true, name: true } },
        unitRel: { select: { id: true, name: true } },
        readings: true,
      },
    })
    return serializeMeter(item)
  }

  async update(user: AuthUser, id: string, dto: {
    name?: string
    serialNumber?: string
    meterType?: string
    unit?: string
    propertyId?: string
    unitId?: string
    parentMeterId?: string | null
    installDate?: string
    calibrationDue?: string
    manufacturer?: string
    location?: string
    isActive?: boolean
    note?: string
  }) {
    const current = await this.getById(user, id)

    if (dto.parentMeterId) {
      // Měřidlo s vlastními children nesmí být zároveň child (max 1 úroveň hierarchie)
      const childCount = await this.prisma.meter.count({ where: { parentMeterId: id } })
      if (childCount > 0) {
        throw new BadRequestException('Měřidlo s podružnými měřidly nemůže mít nadřazené měřidlo')
      }
      const targetPropertyId = dto.propertyId !== undefined ? (dto.propertyId || null) : current.propertyId
      const targetMeterType = dto.meterType ?? current.meterType
      await this.validateParentMeter(user, dto.parentMeterId, targetPropertyId, targetMeterType, id)
    }

    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber
    if (dto.meterType !== undefined) data.meterType = dto.meterType
    if (dto.unit !== undefined) data.unit = dto.unit
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId || null
    if (dto.unitId !== undefined) data.unitId = dto.unitId || null
    if (dto.parentMeterId !== undefined) data.parentMeterId = dto.parentMeterId || null
    if (dto.installDate !== undefined) data.installDate = dto.installDate ? new Date(dto.installDate) : null
    if (dto.calibrationDue !== undefined) data.calibrationDue = dto.calibrationDue ? new Date(dto.calibrationDue) : null
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer
    if (dto.location !== undefined) data.location = dto.location
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.note !== undefined) data.note = dto.note

    const item = await this.prisma.meter.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true } },
        unitRel: { select: { id: true, name: true } },
        readings: { orderBy: { readingDate: 'desc' }, take: 2 },
      },
    })
    return serializeMeter(item)
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id)
    // AUDIT: soft delete — set isActive=false, preserved for audit trail (Wave 2)
    await this.prisma.meter.update({ where: { id }, data: { isActive: false } })
    return { success: true }
  }

  // ── Readings ──

  async addReading(user: AuthUser, meterId: string, dto: {
    readingDate: string
    value: number
    note?: string
  }) {
    await this.getById(user, meterId)

    // Get previous reading for consumption calc
    const prev = await this.prisma.meterReading.findFirst({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
    })
    const consumption = prev ? Math.max(0, dto.value - Number(prev.value)) : null

    // Get user name
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    })

    const reading = await this.prisma.meterReading.create({
      data: {
        meterId,
        readingDate: new Date(dto.readingDate),
        value: dto.value,
        consumption,
        source: 'manual',
        readBy: dbUser?.name ?? 'System',
        note: dto.note,
      },
    })

    // Update meter's last reading
    await this.prisma.meter.update({
      where: { id: meterId },
      data: {
        lastReading: dto.value,
        lastReadingDate: new Date(dto.readingDate),
      },
    })

    return serializeReading(reading)
  }

  async getReadings(user: AuthUser, meterId: string) {
    await this.getById(user, meterId)

    const readings = await this.prisma.meterReading.findMany({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
    })
    return readings.map(serializeReading)
  }

  async deleteReading(user: AuthUser, meterId: string, readingId: string) {
    await this.getById(user, meterId)

    await this.prisma.meterReading.delete({ where: { id: readingId } })

    // Recalculate last reading
    const latest = await this.prisma.meterReading.findFirst({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
    })
    await this.prisma.meter.update({
      where: { id: meterId },
      data: {
        lastReading: latest ? Number(latest.value) : null,
        lastReadingDate: latest?.readingDate ?? null,
      },
    })

    return { success: true }
  }

  // ─── INITIAL READINGS ──────────────────────────────────────────

  async setInitialReading(user: AuthUser, meterId: string, dto: {
    value: number
    readingDate: string
    note?: string
  }) {
    await this.getById(user, meterId)

    // Check if initial reading already exists — update instead of duplicate
    const existing = await this.prisma.meterReading.findFirst({
      where: { meterId, isInitial: true },
    })

    if (existing) {
      const updated = await this.prisma.meterReading.update({
        where: { id: existing.id },
        data: {
          value: dto.value,
          readingDate: new Date(dto.readingDate),
          note: dto.note,
        },
      })
      await this.prisma.meter.update({
        where: { id: meterId },
        data: { lastReading: dto.value, lastReadingDate: new Date(dto.readingDate) },
      })
      return serializeReading(updated)
    }

    const reading = await this.prisma.meterReading.create({
      data: {
        meterId,
        readingDate: new Date(dto.readingDate),
        value: dto.value,
        consumption: 0,
        source: 'initial',
        isInitial: true,
        readBy: 'System',
        note: dto.note,
      },
    })

    await this.prisma.meter.update({
      where: { id: meterId },
      data: { lastReading: dto.value, lastReadingDate: new Date(dto.readingDate) },
    })

    return serializeReading(reading)
  }

  async setBulkInitialReadings(user: AuthUser, propertyId: string, readings: Array<{
    meterId: string; value: number; readingDate: string; note?: string
  }>) {
    let set = 0, updated = 0, errors = 0

    for (const r of readings) {
      try {
        const existing = await this.prisma.meterReading.findFirst({
          where: { meterId: r.meterId, isInitial: true },
        })
        await this.setInitialReading(user, r.meterId, r)
        if (existing) updated++; else set++
      } catch {
        errors++
      }
    }

    return { set, updated, errors }
  }

  // ── Common consumption (vyhláška 269/2015 Sb.) ──

  /**
   * Společná spotřeba pro patní (parent) měřidlo za období.
   * Vrací odečet patního, součet podružných a rozdíl = společná spotřeba
   * (rozvody, ztráty), která se distribuuje podle plochy v settlement.
   */
  async calculateCommonConsumption(
    user: AuthUser,
    parentMeterId: string,
    periodFrom: Date,
    periodTo: Date,
  ) {
    const parent = await this.prisma.meter.findFirst({
      where: { id: parentMeterId, tenantId: user.tenantId },
      include: {
        childMeters: { select: { id: true, name: true, unitId: true } },
      },
    })
    if (!parent) throw new NotFoundException('Patní měřidlo nenalezeno')
    await this.scope.verifyEntityAccess(user, parent.propertyId)

    if (parent.parentMeterId != null) {
      throw new BadRequestException('Zadané měřidlo není patní (má vlastní parent)')
    }
    if (parent.childMeters.length === 0) {
      throw new BadRequestException('Patní měřidlo nemá žádná podružná měřidla')
    }

    const parentConsumption = await this.getConsumptionInPeriod(parentMeterId, periodFrom, periodTo)

    // TODO: Optimize N+1 — batch fetch readings for all meterIds in one query.
    // Current: 2 queries per child (start + end reading). Acceptable for <50 meters per parent.
    const childrenBreakdown = await Promise.all(
      parent.childMeters.map(async (child) => {
        const consumption = await this.getConsumptionInPeriod(child.id, periodFrom, periodTo)
        return {
          meterId: child.id,
          meterName: child.name,
          unitId: child.unitId,
          consumption,
        }
      }),
    )

    const childrenConsumptionTotal = childrenBreakdown.reduce((s, c) => s + c.consumption, 0)
    const commonConsumption = Math.max(0, parentConsumption - childrenConsumptionTotal)

    return {
      parentMeterId,
      periodFrom: periodFrom.toISOString(),
      periodTo: periodTo.toISOString(),
      parentConsumption,
      childrenConsumptionTotal,
      commonConsumption,
      childrenBreakdown,
    }
  }

  /**
   * Spotřeba měřidla za období: end reading − start reading.
   * Hledá nejbližší readings <= periodFrom (start) a <= periodTo (end).
   */
  private async getConsumptionInPeriod(
    meterId: string,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<number> {
    const startReading = await this.prisma.meterReading.findFirst({
      where: { meterId, readingDate: { lte: periodFrom } },
      orderBy: { readingDate: 'desc' },
    })
    const endReading = await this.prisma.meterReading.findFirst({
      where: { meterId, readingDate: { lte: periodTo } },
      orderBy: { readingDate: 'desc' },
    })
    if (!startReading || !endReading || startReading.id === endReading.id) return 0
    // Clamp negative — meter rollover, manuální oprava starého readingu apod.
    return Math.max(0, Number(endReading.value) - Number(startReading.value))
  }
}
