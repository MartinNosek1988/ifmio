import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SlaPolicyService } from './sla-policy.service'
import type { HelpdeskListQueryDto, CreateTicketDto, UpdateTicketDto, CreateItemDto, CreateProtocolDto } from './dto/helpdesk.dto'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class HelpdeskService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private notifications: NotificationsService,
    private slaPolicy: SlaPolicyService,
  ) {}

  private async nextTicketNumber(tenantId: string): Promise<number> {
    const last = await this.prisma.helpdeskTicket.findFirst({
      where:   { tenantId },
      orderBy: { number: 'desc' },
      select:  { number: true },
    })
    return (last?.number ?? 0) + 1
  }

  async listTickets(user: AuthUser, query: HelpdeskListQueryDto) {
    const { status, priority, propertyId, search } = query
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...scopeWhere,
      ...(status     ? { status }     : {}),
      ...(priority   ? { priority }   : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(query.overdue === 'true' ? {
        status: { in: ['open', 'in_progress'] },
        resolutionDueAt: { lt: now },
      } : {}),
      ...(query.escalated === 'true' ? {
        escalationLevel: { gt: 0 },
      } : {}),
      ...(search ? {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
        include: {
          property: { select: { id: true, name: true } },
          unit:     { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, name: true } },
          _count:   { select: { items: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ])

    return {
      data: items.map((t) => this.serializeTicket(t)),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where:   { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        unit:     { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, name: true } },
        items:    { orderBy: { createdAt: 'asc' } },
        protocol: true,
      },
    })
    if (!ticket) throw new NotFoundException(`Ticket ${id} nenalezen`)
    await this.scope.verifyEntityAccess(user, ticket.propertyId)
    return {
      ...this.serializeTicket(ticket),
      items: ticket.items.map((i) => ({
        ...i,
        quantity:   Number(i.quantity),
        unitPrice:  Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    }
  }

  async createTicket(user: AuthUser, dto: CreateTicketDto) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const number = await this.nextTicketNumber(user.tenantId)
    const priority = dto.priority ?? 'medium'
    const now = new Date()
    const effectiveSla = await this.slaPolicy.getEffectiveSla(user.tenantId, priority, dto.propertyId)
    const sla = this.slaPolicy.calculateSlaDates(effectiveSla, now)

    const ticket = await this.prisma.helpdeskTicket.create({
      data: {
        tenantId:        user.tenantId,
        number,
        title:           dto.title,
        description:     dto.description,
        category:        (dto.category ?? 'general') as any,
        priority:        priority as any,
        propertyId:      dto.propertyId ?? null,
        unitId:          dto.unitId    ?? null,
        residentId:      dto.residentId ?? null,
        responseDueAt:   sla.responseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
      },
    })
    return this.serializeTicket(ticket)
  }

  async updateTicket(user: AuthUser, id: string, dto: UpdateTicketDto) {
    const existing = await this.findOne(user, id)
    const data: Record<string, unknown> = { ...dto }

    // Auto-set resolvedAt when resolving
    if (dto.status === 'resolved' && !dto.resolvedAt) {
      data.resolvedAt = new Date()
    }

    // Track first response (open → in_progress)
    if (dto.status === 'in_progress' && existing.status === 'open' && !existing.firstResponseAt) {
      data.firstResponseAt = new Date()
    }

    // Recalculate SLA if priority changed
    if (dto.priority && dto.priority !== existing.priority) {
      const effectiveSla = await this.slaPolicy.getEffectiveSla(user.tenantId, dto.priority, existing.propertyId)
      const sla = this.slaPolicy.calculateSlaDates(effectiveSla, new Date(existing.createdAt))
      data.responseDueAt = sla.responseDueAt
      data.resolutionDueAt = sla.resolutionDueAt
    }

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id }, data,
    })
    return this.serializeTicket(ticket)
  }

  async deleteTicket(user: AuthUser, id: string) {
    await this.findOne(user, id)
    await this.prisma.helpdeskTicket.delete({ where: { id } })
  }

  // ─── Ownership actions ──────────────────────────────────────

  async assignTicket(user: AuthUser, id: string, assigneeId: string) {
    const existing = await this.findOne(user, id)
    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
    })
    if (!assignee) throw new BadRequestException('Řešitel nenalezen')

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id },
      data: { assigneeId },
    })

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'TICKET_ASSIGNED',
        entity: 'HelpdeskTicket',
        entityId: id,
        oldData: { assigneeId: existing.assigneeId },
        newData: { assigneeId, assigneeName: assignee.name },
      },
    })

    // Notify the assignee
    const num = `HD-${String(existing.number).padStart(4, '0')}`
    await this.notifications.create({
      tenantId: user.tenantId,
      userId: assigneeId,
      type: 'ticket_new',
      title: `Přiřazen ticket ${num}`,
      body: existing.title,
      entityId: id,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })

    return this.serializeTicket(ticket)
  }

  async claimTicket(user: AuthUser, id: string) {
    const existing = await this.findOne(user, id)
    if (existing.assigneeId === user.id) {
      throw new BadRequestException('Ticket je již přiřazen vám')
    }

    const data: Record<string, unknown> = { assigneeId: user.id }

    // Auto-transition open → in_progress on claim
    if (existing.status === 'open') {
      data.status = 'in_progress'
      if (!existing.firstResponseAt) {
        data.firstResponseAt = new Date()
      }
    }

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id }, data,
    })

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'TICKET_CLAIMED',
        entity: 'HelpdeskTicket',
        entityId: id,
        oldData: { assigneeId: existing.assigneeId, status: existing.status },
        newData: { assigneeId: user.id, status: ticket.status },
      },
    })

    return this.serializeTicket(ticket)
  }

  async quickResolve(user: AuthUser, id: string) {
    const existing = await this.findOne(user, id)
    if (existing.status === 'resolved' || existing.status === 'closed') {
      throw new BadRequestException('Ticket je již vyřešen/uzavřen')
    }

    const now = new Date()
    const data: Record<string, unknown> = {
      status: 'resolved',
      resolvedAt: now,
      assigneeId: existing.assigneeId ?? user.id,
    }
    if (!existing.firstResponseAt) {
      data.firstResponseAt = now
    }

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id }, data,
    })

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'TICKET_RESOLVED',
        entity: 'HelpdeskTicket',
        entityId: id,
        oldData: { status: existing.status },
        newData: { status: 'resolved', resolvedAt: now.toISOString() },
      },
    })

    return this.serializeTicket(ticket)
  }

  // Items
  async addItem(user: AuthUser, ticketId: string, dto: CreateItemDto) {
    await this.findOne(user, ticketId)
    const totalPrice = (dto.quantity ?? 1) * (dto.unitPrice ?? 0)
    return this.prisma.helpdeskItem.create({
      data: {
        ticketId,
        description: dto.description,
        unit:        dto.unit ?? null,
        quantity:    dto.quantity ?? 1,
        unitPrice:   dto.unitPrice ?? 0,
        totalPrice,
      },
    })
  }

  async removeItem(user: AuthUser, ticketId: string, itemId: string) {
    await this.findOne(user, ticketId)
    await this.prisma.helpdeskItem.delete({ where: { id: itemId } })
  }

  // Protocol
  async createOrUpdateProtocol(user: AuthUser, ticketId: string, dto: CreateProtocolDto) {
    await this.findOne(user, ticketId)

    const ticket = await this.prisma.helpdeskTicket.findUnique({
      where:  { id: ticketId },
      select: { number: true },
    })

    const number = `PROT-${String(ticket!.number).padStart(4, '0')}`

    const data: Record<string, unknown> = { ...dto }
    return this.prisma.helpdeskProtocol.upsert({
      where:  { ticketId },
      create: { ticketId, number, ...data } as any,
      update: data as any,
    })
  }

  private serializeTicket(t: any) {
    return {
      ...t,
      createdAt:       t.createdAt.toISOString(),
      updatedAt:       t.updatedAt.toISOString(),
      resolvedAt:      t.resolvedAt?.toISOString() ?? null,
      responseDueAt:   t.responseDueAt?.toISOString() ?? null,
      resolutionDueAt: t.resolutionDueAt?.toISOString() ?? null,
      firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
      escalatedAt:     t.escalatedAt?.toISOString() ?? null,
    }
  }

  async getSlaStats(user: AuthUser) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const baseWhere = {
      tenantId: user.tenantId,
      status: { in: ['open', 'in_progress'] } as any,
      ...scopeWhere,
    }

    const [total, overdue, escalated, dueSoon] = await Promise.all([
      this.prisma.helpdeskTicket.count({ where: baseWhere }),
      this.prisma.helpdeskTicket.count({
        where: { ...baseWhere, resolutionDueAt: { lt: now } },
      }),
      this.prisma.helpdeskTicket.count({
        where: { ...baseWhere, escalationLevel: { gt: 0 } },
      }),
      this.prisma.helpdeskTicket.count({
        where: {
          ...baseWhere,
          resolutionDueAt: {
            gt: now,
            lt: new Date(now.getTime() + 24 * 3_600_000), // next 24h
          },
        },
      }),
    ])

    return { total, overdue, escalated, dueSoon }
  }

  async getDashboard(user: AuthUser, days: number) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const since = new Date(now)
    since.setDate(since.getDate() - days)

    const tenantWhere = { tenantId: user.tenantId, ...scopeWhere }
    const activeWhere = { ...tenantWhere, status: { in: ['open', 'in_progress'] } as any }

    // ── KPI counts ──────────────────────────────────────────────
    const [total, open, overdue, escalated, dueSoon, resolvedInPeriod, createdInPeriod] =
      await Promise.all([
        this.prisma.helpdeskTicket.count({ where: tenantWhere }),
        this.prisma.helpdeskTicket.count({ where: activeWhere }),
        this.prisma.helpdeskTicket.count({
          where: { ...activeWhere, resolutionDueAt: { lt: now } },
        }),
        this.prisma.helpdeskTicket.count({
          where: { ...activeWhere, escalationLevel: { gt: 0 } },
        }),
        this.prisma.helpdeskTicket.count({
          where: {
            ...activeWhere,
            resolutionDueAt: { gt: now, lt: new Date(now.getTime() + 24 * 3_600_000) },
          },
        }),
        this.prisma.helpdeskTicket.count({
          where: { ...tenantWhere, resolvedAt: { gte: since } },
        }),
        this.prisma.helpdeskTicket.count({
          where: { ...tenantWhere, createdAt: { gte: since } },
        }),
      ])

    // SLA compliance = resolved in period within SLA / total resolved in period
    const resolvedInPeriodTickets = await this.prisma.helpdeskTicket.findMany({
      where: { ...tenantWhere, resolvedAt: { gte: since } },
      select: { resolvedAt: true, resolutionDueAt: true },
    })
    const withinSla = resolvedInPeriodTickets.filter(
      (t) => t.resolvedAt && t.resolutionDueAt && t.resolvedAt <= t.resolutionDueAt,
    ).length
    const slaCompliancePct = resolvedInPeriod > 0
      ? Math.round((withinSla / resolvedInPeriod) * 100)
      : 0

    // ── Breakdown by priority ───────────────────────────────────
    const priorities = ['low', 'medium', 'high', 'urgent'] as const
    const byPriority = await Promise.all(
      priorities.map(async (p) => ({
        priority: p,
        open: await this.prisma.helpdeskTicket.count({
          where: { ...activeWhere, priority: p as any },
        }),
        total: await this.prisma.helpdeskTicket.count({
          where: { ...tenantWhere, priority: p as any, createdAt: { gte: since } },
        }),
      })),
    )

    // ── Breakdown by property (top 10) ──────────────────────────
    const allProperties = await this.prisma.helpdeskTicket.groupBy({
      by: ['propertyId'],
      where: { ...tenantWhere, propertyId: { not: null }, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })
    const propertyIds = allProperties
      .map((p) => p.propertyId)
      .filter((id): id is string => id !== null)
    const propertyNames = propertyIds.length > 0
      ? await this.prisma.property.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, name: true },
        })
      : []
    const nameMap = new Map(propertyNames.map((p) => [p.id, p.name]))
    const byProperty = allProperties.map((p) => ({
      propertyId: p.propertyId,
      name: nameMap.get(p.propertyId!) ?? '—',
      count: p._count.id,
    }))

    // ── Daily trend ─────────────────────────────────────────────
    const trendTickets = await this.prisma.helpdeskTicket.findMany({
      where: { ...tenantWhere, createdAt: { gte: since } },
      select: { createdAt: true, resolvedAt: true },
      orderBy: { createdAt: 'asc' },
    })
    const trendMap = new Map<string, { created: number; resolved: number }>()
    for (let d = new Date(since); d <= now; d.setDate(d.getDate() + 1)) {
      trendMap.set(d.toISOString().slice(0, 10), { created: 0, resolved: 0 })
    }
    for (const t of trendTickets) {
      const day = t.createdAt.toISOString().slice(0, 10)
      const entry = trendMap.get(day)
      if (entry) entry.created++
      if (t.resolvedAt) {
        const rDay = t.resolvedAt.toISOString().slice(0, 10)
        const rEntry = trendMap.get(rDay)
        if (rEntry) rEntry.resolved++
      }
    }
    const trend = Array.from(trendMap.entries()).map(([date, v]) => ({
      date, ...v,
    }))

    // ── Top risk tickets ────────────────────────────────────────
    const topRisk = await this.prisma.helpdeskTicket.findMany({
      where: { ...activeWhere, resolutionDueAt: { lt: now } },
      orderBy: [{ escalationLevel: 'desc' }, { priority: 'desc' }, { resolutionDueAt: 'asc' }],
      take: 10,
      include: {
        property: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return {
      kpi: {
        total, open, overdue, escalated, dueSoon,
        resolvedInPeriod, createdInPeriod, slaCompliancePct,
      },
      byPriority,
      byProperty,
      trend,
      topRisk: topRisk.map((t) => this.serializeTicket(t)),
    }
  }

  async getProtocol(user: AuthUser, ticketId: string) {
    await this.findOne(user, ticketId)
    const protocol = await this.prisma.helpdeskProtocol.findUnique({
      where:   { ticketId },
      include: {
        ticket: {
          include: {
            items:    true,
            property: { select: { name: true } },
            unit:     { select: { name: true } },
            resident: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!protocol) throw new NotFoundException('Protokol nenalezen')
    return protocol
  }
}
