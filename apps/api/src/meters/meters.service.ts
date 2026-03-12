import { Injectable, NotFoundException } from '@nestjs/common'
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
      },
    })
    if (!item) throw new NotFoundException('Měřidlo nenalezeno')
    await this.scope.verifyEntityAccess(user, item.propertyId)
    return serializeMeter(item)
  }

  async create(user: AuthUser, dto: {
    name: string
    serialNumber: string
    meterType?: string
    unit?: string
    propertyId?: string
    unitId?: string
    installDate?: string
    calibrationDue?: string
    manufacturer?: string
    location?: string
    note?: string
  }) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const item = await this.prisma.meter.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        serialNumber: dto.serialNumber,
        meterType: (dto.meterType as any) ?? 'elektrina',
        unit: dto.unit ?? 'kWh',
        propertyId: dto.propertyId || null,
        unitId: dto.unitId || null,
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
    installDate?: string
    calibrationDue?: string
    manufacturer?: string
    location?: string
    isActive?: boolean
    note?: string
  }) {
    await this.getById(user, id)

    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber
    if (dto.meterType !== undefined) data.meterType = dto.meterType
    if (dto.unit !== undefined) data.unit = dto.unit
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId || null
    if (dto.unitId !== undefined) data.unitId = dto.unitId || null
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
    await this.prisma.meter.delete({ where: { id } })
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
}
