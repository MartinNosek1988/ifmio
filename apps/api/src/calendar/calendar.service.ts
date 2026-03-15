import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { CalendarEventDto, CalendarStatsDto } from './calendar.dto'
import { toBusinessDate } from '../common/utils/date.utils'
import type { AuthUser } from '@ifmio/shared-types';

function serializeEvent(item: any): CalendarEventDto {
  return {
    id: item.id,
    source: 'custom',
    title: item.title,
    eventType: item.eventType,
    date: toBusinessDate(item.date),
    dateTo: item.dateTo ? toBusinessDate(item.dateTo) : null,
    timeFrom: item.timeFrom ?? null,
    timeTo: item.timeTo ?? null,
    propertyId: item.propertyId ?? null,
    propertyName: null,
    location: item.location ?? null,
    description: item.description ?? null,
    attendees: item.attendees ?? [],
  }
}

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async getEvents(user: AuthUser, query: {
    from?: string; to?: string; eventType?: string; search?: string
  }): Promise<CalendarEventDto[]> {
    const tenantId = user.tenantId
    const now = new Date()
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = query.to ? new Date(query.to) : new Date(now.getFullYear(), now.getMonth() + 2, 0)

    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const results: CalendarEventDto[] = []

    // 1. Custom calendar events
    const customWhere: any = {
      tenantId,
      date: { gte: from, lte: to },
      ...scopeWhere,
    }
    const CUSTOM_EVENT_TYPES = ['schuze', 'revize', 'udrzba', 'predani', 'prohlidka', 'ostatni']
    if (query.eventType && query.eventType !== 'all' && CUSTOM_EVENT_TYPES.includes(query.eventType)) {
      customWhere.eventType = query.eventType
    }
    if (query.search) {
      customWhere.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const SYNTHETIC_SOURCES = ['workorder', 'contract', 'meter', 'helpdesk']
    const isSyntheticFilter = query.eventType && SYNTHETIC_SOURCES.includes(query.eventType)

    if (!isSyntheticFilter) {
      const customEvents = await this.prisma.calendarEvent.findMany({
        where: customWhere,
        orderBy: { date: 'asc' },
      })
      results.push(...customEvents.map(serializeEvent))
    }

    // Skip aggregated events if filtering by specific custom type
    const skipAggregated = query.eventType && !['all', 'workorder', 'contract', 'meter', 'helpdesk'].includes(query.eventType)

    if (!skipAggregated) {
      // 2. Work Orders with deadlines
      if (!query.eventType || query.eventType === 'all' || query.eventType === 'workorder') {
        const wos = await this.prisma.workOrder.findMany({
          where: {
            tenantId,
            deadline: { gte: from, lte: to },
            status: { notIn: ['uzavrena', 'zrusena'] },
            ...scopeWhere,
          } as any,
          include: { property: { select: { id: true, name: true } } },
          orderBy: { deadline: 'asc' },
        })
        for (const wo of wos) {
          results.push({
            id: `wo-${wo.id}`,
            source: 'workorder',
            sourceId: wo.id,
            title: `WO: ${wo.title}`,
            eventType: 'workorder',
            date: toBusinessDate(wo.deadline!),
            propertyId: wo.propertyId ?? null,
            propertyName: wo.property?.name ?? null,
            description: wo.description ?? null,
            location: null,
            attendees: wo.assignee ? [wo.assignee] : [],
          })
        }
      }

      // 3. Helpdesk ticket deadlines
      if (!query.eventType || query.eventType === 'all' || query.eventType === 'helpdesk') {
        const tickets = await this.prisma.helpdeskTicket.findMany({
          where: {
            tenantId,
            resolutionDueAt: { gte: from, lte: to },
            status: { notIn: ['resolved', 'closed'] },
            ...scopeWhere,
          } as any,
          include: {
            property: { select: { id: true, name: true } },
            asset: { select: { name: true } },
            assignee: { select: { name: true } },
          },
          orderBy: { resolutionDueAt: 'asc' },
        })
        for (const t of tickets) {
          const num = `HD-${String(t.number).padStart(4, '0')}`
          const isRecurring = (t as any).requestOrigin === 'recurring_plan'
          const prefix = isRecurring ? 'Opakovaná činnost' : 'Požadavek'
          results.push({
            id: `hd-${t.id}`,
            source: 'helpdesk',
            sourceId: t.id,
            title: `${prefix}: ${num} – ${t.title}`,
            eventType: 'helpdesk',
            date: toBusinessDate(t.resolutionDueAt!),
            propertyId: t.propertyId ?? null,
            propertyName: t.property?.name ?? null,
            description: [isRecurring ? 'Opakovaná činnost' : '', t.asset?.name ? `Zařízení: ${t.asset.name}` : '', t.assignee?.name ? `Řešitel: ${t.assignee.name}` : ''].filter(Boolean).join(', ') || null,
            location: null,
            attendees: t.assignee?.name ? [t.assignee.name] : [],
          })
        }
      }

      // 4. Lease agreements nearing expiration (endDate within range)
      if (!query.eventType || query.eventType === 'all' || query.eventType === 'contract') {
        const leases = await this.prisma.leaseAgreement.findMany({
          where: {
            tenantId,
            endDate: { gte: from, lte: to },
            status: 'aktivni',
            ...scopeWhere,
          } as any,
          include: {
            property: { select: { id: true, name: true } },
            resident: { select: { firstName: true, lastName: true } },
          },
          orderBy: { endDate: 'asc' },
        })
        for (const la of leases) {
          const resName = la.resident ? `${la.resident.firstName} ${la.resident.lastName}` : ''
          results.push({
            id: `la-${la.id}`,
            source: 'contract',
            sourceId: la.id,
            title: `Smlouva: ${la.contractNumber || resName || 'Bez čísla'}`,
            eventType: 'contract',
            date: toBusinessDate(la.endDate!),
            propertyId: la.propertyId ?? null,
            propertyName: la.property?.name ?? null,
            description: resName ? `Nájemce: ${resName}` : null,
            location: null,
            attendees: resName ? [resName] : [],
          })
        }
      }

      // 4. Meter calibrations due
      if (!query.eventType || query.eventType === 'all' || query.eventType === 'meter') {
        const meters = await this.prisma.meter.findMany({
          where: {
            tenantId,
            isActive: true,
            calibrationDue: { gte: from, lte: to },
            ...scopeWhere,
          } as any,
          include: { property: { select: { id: true, name: true } } },
          orderBy: { calibrationDue: 'asc' },
        })
        for (const m of meters) {
          results.push({
            id: `mt-${m.id}`,
            source: 'meter',
            sourceId: m.id,
            title: `Kalibrace: ${m.name} (${m.serialNumber})`,
            eventType: 'meter',
            date: toBusinessDate(m.calibrationDue!),
            propertyId: m.propertyId ?? null,
            propertyName: m.property?.name ?? null,
            description: `Typ: ${m.meterType}, Jednotka: ${m.unit}`,
            location: m.location ?? null,
            attendees: [],
          })
        }
      }
    }

    // Filter by search for aggregated events too
    if (query.search) {
      const q = query.search.toLowerCase()
      return results.filter(e =>
        e.source === 'custom' ||
        e.title.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      )
    }

    // Sort all by date
    results.sort((a, b) => a.date.localeCompare(b.date))
    return results
  }

  async getStats(user: AuthUser): Promise<CalendarStatsDto> {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const futureLimit = new Date(now.getFullYear(), now.getMonth() + 3, 0)

    const baseCustom = { tenantId, ...scopeWhere }

    const [customTotal, customMonth, customUpcoming] = await Promise.all([
      this.prisma.calendarEvent.count({ where: baseCustom as any }),
      this.prisma.calendarEvent.count({ where: { ...baseCustom, date: { gte: monthStart, lte: monthEnd } } as any }),
      this.prisma.calendarEvent.count({ where: { ...baseCustom, date: { gte: now, lte: futureLimit } } as any }),
    ])

    // Count aggregated upcoming events
    const [woCount, contractCount, meterCount, helpdeskCount] = await Promise.all([
      this.prisma.workOrder.count({
        where: { tenantId, deadline: { gte: now, lte: futureLimit }, status: { notIn: ['uzavrena', 'zrusena'] }, ...scopeWhere } as any,
      }),
      this.prisma.leaseAgreement.count({
        where: { tenantId, endDate: { gte: now, lte: futureLimit }, status: 'aktivni', ...scopeWhere } as any,
      }),
      this.prisma.meter.count({
        where: { tenantId, isActive: true, calibrationDue: { gte: now, lte: futureLimit }, ...scopeWhere } as any,
      }),
      this.prisma.helpdeskTicket.count({
        where: { tenantId, resolutionDueAt: { gte: now, lte: futureLimit }, status: { notIn: ['resolved', 'closed'] }, ...scopeWhere } as any,
      }),
    ])

    return {
      total: customTotal,
      thisMonth: customMonth,
      upcoming: customUpcoming + woCount + contractCount + meterCount + helpdeskCount,
      workorders: woCount,
      contracts: contractCount,
      meters: meterCount,
      helpdesk: helpdeskCount,
    }
  }

  async getById(user: AuthUser, id: string): Promise<CalendarEventDto> {
    const item = await this.prisma.calendarEvent.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!item) throw new NotFoundException('Událost nenalezena')
    await this.scope.verifyEntityAccess(user, item.propertyId)
    return serializeEvent(item)
  }

  async create(user: AuthUser, dto: {
    title: string
    eventType?: string
    date: string
    dateTo?: string
    timeFrom?: string
    timeTo?: string
    propertyId?: string
    location?: string
    description?: string
    attendees?: string[]
  }): Promise<CalendarEventDto> {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const item = await this.prisma.calendarEvent.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        eventType: (dto.eventType as any) ?? 'ostatni',
        date: new Date(dto.date),
        dateTo: dto.dateTo ? new Date(dto.dateTo) : null,
        timeFrom: dto.timeFrom || null,
        timeTo: dto.timeTo || null,
        propertyId: dto.propertyId || null,
        location: dto.location || null,
        description: dto.description || null,
        attendees: dto.attendees ?? [],
      },
    })
    return serializeEvent(item)
  }

  async update(user: AuthUser, id: string, dto: {
    title?: string
    eventType?: string
    date?: string
    dateTo?: string
    timeFrom?: string
    timeTo?: string
    propertyId?: string
    location?: string
    description?: string
    attendees?: string[]
  }): Promise<CalendarEventDto> {
    await this.getById(user, id)

    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.eventType !== undefined) data.eventType = dto.eventType
    if (dto.date !== undefined) data.date = new Date(dto.date)
    if (dto.dateTo !== undefined) data.dateTo = dto.dateTo ? new Date(dto.dateTo) : null
    if (dto.timeFrom !== undefined) data.timeFrom = dto.timeFrom || null
    if (dto.timeTo !== undefined) data.timeTo = dto.timeTo || null
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId || null
    if (dto.location !== undefined) data.location = dto.location || null
    if (dto.description !== undefined) data.description = dto.description || null
    if (dto.attendees !== undefined) data.attendees = dto.attendees

    const item = await this.prisma.calendarEvent.update({
      where: { id },
      data,
    })
    return serializeEvent(item)
  }

  async remove(user: AuthUser, id: string): Promise<{ success: boolean }> {
    await this.getById(user, id)
    await this.prisma.calendarEvent.delete({ where: { id } })
    return { success: true }
  }
}
