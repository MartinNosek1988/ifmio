import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EmailService } from '../email/email.service'
import { SlaPolicyService } from './sla-policy.service'
import type { HelpdeskListQueryDto, CreateTicketDto, UpdateTicketDto, CreateItemDto, CreateProtocolDto } from './dto/helpdesk.dto'
import type { AuthUser } from '@ifmio/shared-types'

const USER_SELECT = { id: true, name: true, email: true } as const

const STATUS_LABELS: Record<string, string> = {
  open: 'Nový', in_progress: 'V řešení', resolved: 'Vyřešený', closed: 'Uzavřený',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní',
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'open', 'closed'],
  resolved: ['closed', 'open'],
  closed: [],
}

const NOT_DELETED = { deletedAt: null }

@Injectable()
export class HelpdeskService {
  private readonly logger = new Logger(HelpdeskService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private notifications: NotificationsService,
    private email: EmailService,
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

  private fmtTicketNum(num: number): string {
    return `HD-${String(num).padStart(4, '0')}`
  }

  private readonly ticketInclude = {
    property:   { select: { id: true, name: true } },
    unit:       { select: { id: true, name: true } },
    resident:   { select: { id: true, firstName: true, lastName: true } },
    asset:      { select: { id: true, name: true } },
    assignee:   { select: USER_SELECT },
    requester:  { select: USER_SELECT },
    dispatcher: { select: USER_SELECT },
    recurringPlan: { select: { id: true, title: true, scheduleMode: true, frequencyUnit: true, frequencyInterval: true } },
    _count:     { select: { items: true } },
  } as const

  private readonly ticketDetailInclude = {
    property:   { select: { id: true, name: true } },
    unit:       { select: { id: true, name: true } },
    resident:   { select: { id: true, firstName: true, lastName: true } },
    asset:      { select: { id: true, name: true } },
    assignee:   { select: USER_SELECT },
    requester:  { select: USER_SELECT },
    dispatcher: { select: USER_SELECT },
    recurringPlan: { select: { id: true, title: true, scheduleMode: true, frequencyUnit: true, frequencyInterval: true, assetId: true } },
    items:      { orderBy: { createdAt: 'asc' as const } },
    protocol:   true,
  } as const

  async listTickets(user: AuthUser, query: HelpdeskListQueryDto) {
    const { status, priority, propertyId, search } = query
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...NOT_DELETED,
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
      ...(query.requestOrigin ? { requestOrigin: query.requestOrigin } : {}),
      ...(query.recurringPlanId ? { recurringPlanId: query.recurringPlanId } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
        include: this.ticketInclude,
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
      where:   { id, tenantId: user.tenantId, ...NOT_DELETED },
      include: this.ticketDetailInclude,
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
    if (dto.assetId) {
      await this.verifyAssetAccess(user, dto.assetId)
    }
    if (dto.requesterUserId && dto.requesterUserId !== user.id) {
      await this.verifyUserAccess(user, dto.requesterUserId)
    }
    if (dto.dispatcherUserId) {
      await this.verifyUserAccess(user, dto.dispatcherUserId)
    }
    if (dto.assigneeId) {
      await this.verifyUserAccess(user, dto.assigneeId)
    }
    const priority = dto.priority ?? 'medium'
    const now = new Date()
    const effectiveSla = await this.slaPolicy.getEffectiveSla(user.tenantId, priority, dto.propertyId)
    const sla = this.slaPolicy.calculateSlaDates(effectiveSla, now)

    let ticket: any
    for (let attempt = 0; attempt < 3; attempt++) {
      const number = await this.nextTicketNumber(user.tenantId)
      try {
        ticket = await this.prisma.helpdeskTicket.create({
          data: {
            tenantId:         user.tenantId,
            number,
            title:            dto.title,
            description:      dto.description,
            category:         (dto.category ?? 'general') as any,
            priority:         priority as any,
            propertyId:       dto.propertyId ?? null,
            unitId:           dto.unitId    ?? null,
            residentId:       dto.residentId ?? null,
            assetId:          dto.assetId ?? null,
            requesterUserId:  dto.requesterUserId ?? user.id,
            dispatcherUserId: dto.dispatcherUserId ?? null,
            assigneeId:       dto.assigneeId ?? null,
            responseDueAt:    sla.responseDueAt,
            resolutionDueAt:  sla.resolutionDueAt,
          },
          include: this.ticketDetailInclude,
        })
        break
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 2) continue
        throw e
      }
    }
    if (!ticket) throw new ConflictException('Nepodařilo se vygenerovat unikátní číslo ticketu')

    const serialized = this.serializeTicket(ticket)

    // Send email notifications (best-effort)
    this.sendTicketEmail(serialized, 'create').catch((err) =>
      this.logger.error(`Email notification failed for ticket create: ${err}`),
    )

    return serialized
  }

  async updateTicket(user: AuthUser, id: string, dto: UpdateTicketDto) {
    const existing = await this.findOne(user, id)
    const data: Record<string, unknown> = {}
    const changes: { field: string; oldValue: string; newValue: string }[] = []

    // Copy simple fields
    for (const key of [
      'title', 'description', 'category', 'propertyId', 'unitId', 'residentId',
    ] as const) {
      if (dto[key] !== undefined) data[key] = dto[key]
    }

    // Asset link
    if (dto.assetId !== undefined) {
      if (dto.assetId && dto.assetId !== existing.assetId) {
        await this.verifyAssetAccess(user, dto.assetId)
      }
      if (dto.assetId !== existing.assetId) {
        changes.push({ field: 'Zařízení', oldValue: existing.asset?.name ?? '—', newValue: dto.assetId ? '(nové)' : '—' })
        data.assetId = dto.assetId || null
      }
    }

    // Responsibility fields — verify tenant access
    if (dto.requesterUserId !== undefined && dto.requesterUserId !== existing.requesterUserId) {
      let newName = '—'
      if (dto.requesterUserId) { const u = await this.verifyUserAccess(user, dto.requesterUserId); newName = u.name }
      data.requesterUserId = dto.requesterUserId || null
      changes.push({ field: 'Zadavatel požadavku', oldValue: existing.requester?.name ?? '—', newValue: newName })
    }
    if (dto.dispatcherUserId !== undefined && dto.dispatcherUserId !== existing.dispatcherUserId) {
      let newName = '—'
      if (dto.dispatcherUserId) { const u = await this.verifyUserAccess(user, dto.dispatcherUserId); newName = u.name }
      data.dispatcherUserId = dto.dispatcherUserId || null
      changes.push({ field: 'Dispečer požadavku', oldValue: existing.dispatcher?.name ?? '—', newValue: newName })
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      let newName = '—'
      if (dto.assigneeId) { const u = await this.verifyUserAccess(user, dto.assigneeId); newName = u.name }
      data.assigneeId = dto.assigneeId || null
      changes.push({ field: 'Řešitel požadavku', oldValue: existing.assignee?.name ?? '—', newValue: newName })
    }

    // Status — validate transition
    if (dto.status && dto.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? []
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Přechod ze stavu '${existing.status}' na '${dto.status}' není povolený`)
      }
      data.status = dto.status
      changes.push({
        field: 'Stav',
        oldValue: STATUS_LABELS[existing.status] ?? existing.status,
        newValue: STATUS_LABELS[dto.status] ?? dto.status,
      })
    }

    // Auto-set resolvedAt when resolving
    if (dto.status === 'resolved' && !dto.resolvedAt) {
      data.resolvedAt = new Date()
    }

    // Track first response (open → in_progress)
    if (dto.status === 'in_progress' && existing.status === 'open' && !existing.firstResponseAt) {
      data.firstResponseAt = new Date()
    }

    // Priority change
    if (dto.priority && dto.priority !== existing.priority) {
      data.priority = dto.priority
      changes.push({
        field: 'Priorita',
        oldValue: PRIORITY_LABELS[existing.priority] ?? existing.priority,
        newValue: PRIORITY_LABELS[dto.priority] ?? dto.priority,
      })

      // Recalculate SLA only if deadline was NOT manually set
      if (!existing.deadlineManuallySet) {
        const effectiveSla = await this.slaPolicy.getEffectiveSla(user.tenantId, dto.priority, existing.propertyId)
        const sla = this.slaPolicy.calculateSlaDates(effectiveSla, new Date(existing.createdAt))
        data.responseDueAt = sla.responseDueAt
        data.resolutionDueAt = sla.resolutionDueAt
        changes.push({
          field: 'Vyřešit do',
          oldValue: existing.resolutionDueAt ? new Date(existing.resolutionDueAt).toLocaleDateString('cs-CZ') : '—',
          newValue: sla.resolutionDueAt.toLocaleDateString('cs-CZ'),
        })
      }
    }

    // Manual deadline override
    if (dto.resolutionDueAt !== undefined) {
      const newDeadline = dto.resolutionDueAt ? new Date(dto.resolutionDueAt) : null
      data.resolutionDueAt = newDeadline
      data.deadlineManuallySet = !!newDeadline
      changes.push({
        field: 'Vyřešit do',
        oldValue: existing.resolutionDueAt ? new Date(existing.resolutionDueAt).toLocaleDateString('cs-CZ') : '—',
        newValue: newDeadline ? newDeadline.toLocaleDateString('cs-CZ') : '—',
      })
    }

    if (Object.keys(data).length === 0) {
      return existing
    }

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id },
      data,
      include: this.ticketDetailInclude,
    })
    const serialized = this.serializeTicket(ticket)

    // Send email on meaningful changes
    if (changes.length > 0) {
      this.sendTicketEmail(serialized, 'update', changes).catch((err) =>
        this.logger.error(`Email notification failed for ticket update: ${err}`),
      )
    }

    // Advance recurring plan on terminal status (best-effort, non-blocking for response)
    if (dto.status === 'resolved' || dto.status === 'closed') {
      try { await this.applyRecurringCompletion(id, new Date()) }
      catch (err) { this.logger.error(`Recurring completion callback failed: ${err}`) }
    }

    return serialized
  }

  async deleteTicket(user: AuthUser, id: string) {
    await this.findOne(user, id)
    await this.prisma.helpdeskTicket.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  // ─── Ownership actions ──────────────────────────────────────

  async assignTicket(user: AuthUser, id: string, assigneeId: string) {
    const existing = await this.findOne(user, id)
    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, tenantId: user.tenantId, isActive: true },
      select: USER_SELECT,
    })
    if (!assignee) throw new BadRequestException('Řešitel nenalezen')

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id },
      data: { assigneeId },
      include: this.ticketDetailInclude,
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

    // Notify the assignee (in-app)
    const num = this.fmtTicketNum(existing.number)
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

    const serialized = this.serializeTicket(ticket)
    this.sendTicketEmail(serialized, 'update', [
      { field: 'Řešitel požadavku', oldValue: existing.assignee?.name ?? '—', newValue: assignee.name },
    ]).catch((err) => this.logger.error(`Email notification failed: ${err}`))

    return serialized
  }

  async claimTicket(user: AuthUser, id: string) {
    const existing = await this.findOne(user, id)
    if (existing.assigneeId === user.id) {
      throw new BadRequestException('Ticket je již přiřazen vám')
    }

    const data: Record<string, unknown> = { assigneeId: user.id }
    const changes: { field: string; oldValue: string; newValue: string }[] = [
      { field: 'Řešitel požadavku', oldValue: existing.assignee?.name ?? '—', newValue: '(převzato)' },
    ]

    // Auto-transition open → in_progress on claim
    if (existing.status === 'open') {
      data.status = 'in_progress'
      if (!existing.firstResponseAt) {
        data.firstResponseAt = new Date()
      }
      changes.push({
        field: 'Stav',
        oldValue: STATUS_LABELS[existing.status] ?? existing.status,
        newValue: STATUS_LABELS['in_progress'],
      })
    }

    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id },
      data,
      include: this.ticketDetailInclude,
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

    const serialized = this.serializeTicket(ticket)
    this.sendTicketEmail(serialized, 'update', changes).catch((err) =>
      this.logger.error(`Email notification failed: ${err}`),
    )

    return serialized
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
      where: { id },
      data,
      include: this.ticketDetailInclude,
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

    const serialized = this.serializeTicket(ticket)
    this.sendTicketEmail(serialized, 'update', [
      {
        field: 'Stav',
        oldValue: STATUS_LABELS[existing.status] ?? existing.status,
        newValue: STATUS_LABELS['resolved'],
      },
    ]).catch((err) => this.logger.error(`Email notification failed: ${err}`))

    // Advance recurring plan
    try { await this.applyRecurringCompletion(id, now) }
    catch (err) { this.logger.error(`Recurring completion callback failed: ${err}`) }

    return serialized
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
    const item = await this.prisma.helpdeskItem.findFirst({
      where: { id: itemId, ticketId },
    })
    if (!item) throw new NotFoundException('Položka nenalezena')
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
    // Protocol PDF linked to ticket via DocumentLink — handled in ProtocolsService.generatePdf()
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
      ...NOT_DELETED,
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

    const tenantWhere = { tenantId: user.tenantId, ...NOT_DELETED, ...scopeWhere }
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
        assignee: { select: USER_SELECT },
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

  // ─── Helpers ──────────────────────────────────────────────────

  private async verifyUserAccess(user: AuthUser, userId: string): Promise<{ id: string; name: string }> {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
    })
    if (!target) throw new BadRequestException('Uživatel nenalezen nebo není aktivní')
    return target
  }

  private async verifyAssetAccess(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!asset) throw new NotFoundException('Zařízení nenalezeno')
  }

  /**
   * Advance recurring plan when a generated ticket reaches terminal status.
   * Idempotent: uses recurringCompletionAppliedAt as guard.
   */
  private async applyRecurringCompletion(ticketId: string, completedAt: Date) {
    const ticket = await this.prisma.helpdeskTicket.findUnique({
      where: { id: ticketId },
      select: { recurringPlanId: true, requestOrigin: true, recurringCompletionAppliedAt: true },
    })

    // Skip: not a recurring ticket, or already applied
    if (!ticket?.recurringPlanId || ticket.requestOrigin !== 'recurring_plan') return
    if (ticket.recurringCompletionAppliedAt) return

    const plan = await this.prisma.recurringActivityPlan.findUnique({
      where: { id: ticket.recurringPlanId },
    })
    if (!plan || !plan.isActive) return

    // Mark ticket as applied (idempotence guard)
    await this.prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { recurringCompletionAppliedAt: completedAt },
    })

    // Update plan
    const updateData: Record<string, unknown> = { lastCompletedAt: completedAt }

    if (plan.scheduleMode === 'from_completion') {
      // Compute next occurrence from completion date
      const d = new Date(completedAt)
      switch (plan.frequencyUnit) {
        case 'day': d.setDate(d.getDate() + plan.frequencyInterval); break
        case 'week': d.setDate(d.getDate() + 7 * plan.frequencyInterval); break
        case 'month':
          d.setMonth(d.getMonth() + plan.frequencyInterval)
          if (plan.dayOfMonth) d.setDate(Math.min(plan.dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
          break
        case 'year':
          d.setFullYear(d.getFullYear() + plan.frequencyInterval)
          if (plan.monthOfYear) d.setMonth(plan.monthOfYear - 1)
          if (plan.dayOfMonth) d.setDate(Math.min(plan.dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
          break
      }
      updateData.nextPlannedAt = d
    }

    await this.prisma.recurringActivityPlan.update({
      where: { id: plan.id },
      data: updateData,
    })

    this.logger.log(`Recurring plan ${plan.id} advanced: lastCompletedAt=${completedAt.toISOString()}${plan.scheduleMode === 'from_completion' ? `, nextPlannedAt=${(updateData.nextPlannedAt as Date).toISOString()}` : ''}`)
  }

  // ─── Email Notifications ─────────────────────────────────────

  private async sendTicketEmail(
    ticket: any,
    event: 'create' | 'update',
    changes?: { field: string; oldValue: string; newValue: string }[],
  ) {
    const recipients = this.collectRecipients(ticket)
    if (recipients.length === 0) return

    const num = this.fmtTicketNum(ticket.number)
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : '')
    const ticketUrl = frontendUrl ? `${frontendUrl}/helpdesk?ticket=${ticket.id}` : ''

    let subject: string
    if (event === 'create') {
      subject = `Nový požadavek: ${num} – ${ticket.title}`
    } else {
      const statusChange = changes?.find((c) => c.field === 'Stav')
      if (statusChange && (statusChange.newValue === 'Vyřešený' || statusChange.newValue === 'Uzavřený')) {
        subject = `Požadavek uzavřen: ${num} – ${ticket.title}`
      } else if (statusChange) {
        subject = `Změna stavu: ${num} – ${ticket.title} (${statusChange.oldValue} → ${statusChange.newValue})`
      } else {
        subject = `Změna požadavku: ${num} – ${ticket.title}`
      }
    }

    const html = this.buildTicketEmailHtml(ticket, num, event, ticketUrl, changes)

    for (const email of recipients) {
      try {
        await this.email.send({ to: email, subject, html })
      } catch (err) {
        this.logger.error(`Failed to send helpdesk email to ${email}: ${err}`)
      }
    }
  }

  private collectRecipients(ticket: any): string[] {
    const emails = new Set<string>()
    if (ticket.requester?.email) emails.add(ticket.requester.email)
    if (ticket.dispatcher?.email) emails.add(ticket.dispatcher.email)
    if (ticket.assignee?.email) emails.add(ticket.assignee.email)
    return Array.from(emails)
  }

  private buildTicketEmailHtml(
    ticket: any,
    num: string,
    event: 'create' | 'update',
    ticketUrl: string,
    changes?: { field: string; oldValue: string; newValue: string }[],
  ): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status
    const priorityLabel = PRIORITY_LABELS[ticket.priority] ?? ticket.priority
    const createdDate = new Date(ticket.createdAt).toLocaleDateString('cs-CZ')
    const createdTime = new Date(ticket.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    const deadline = ticket.resolutionDueAt
      ? new Date(ticket.resolutionDueAt).toLocaleDateString('cs-CZ') + ' ' +
        new Date(ticket.resolutionDueAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
      : '—'

    const heading = event === 'create' ? 'Nový požadavek' : 'Změna požadavku'

    let changesHtml = ''
    if (changes && changes.length > 0) {
      const rows = changes.map((c) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">${esc(c.field)}</td>` +
        `<td style="padding:4px 12px;color:#6b7280;">${esc(c.oldValue)}</td>` +
        `<td style="padding:4px 0;">→ <strong>${esc(c.newValue)}</strong></td></tr>`,
      ).join('')
      changesHtml = `
        <div style="margin:16px 0;">
          <div style="font-weight:600;margin-bottom:6px;">Změněné údaje:</div>
          <table style="font-size:0.9rem;">${rows}</table>
        </div>`
    }

    const assetLine = ticket.asset?.name
      ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Zařízení</td><td style="padding:4px 0;">${esc(ticket.asset.name)}</td></tr>`
      : ''

    return `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><title>${esc(heading)}: ${esc(num)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;">
  <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">ifmio</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">${esc(heading)}: ${esc(num)}</h2>
    <p style="font-size:1.1rem;font-weight:600;">${esc(ticket.title)}</p>

    <table style="font-size:0.9rem;margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Stav</td><td style="padding:4px 0;">${esc(statusLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Priorita</td><td style="padding:4px 0;">${esc(priorityLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Datum zadání</td><td style="padding:4px 0;">${esc(createdDate)} ${esc(createdTime)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Vyřešit do</td><td style="padding:4px 0;">${esc(deadline)}</td></tr>
      ${assetLine}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Zadavatel</td><td style="padding:4px 0;">${esc(ticket.requester?.name ?? '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Dispečer</td><td style="padding:4px 0;">${esc(ticket.dispatcher?.name ?? '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Řešitel</td><td style="padding:4px 0;">${esc(ticket.assignee?.name ?? '—')}</td></tr>
    </table>

    ${changesHtml}

    ${ticketUrl ? `<a href="${encodeURI(ticketUrl)}"
       style="display:inline-block;background:#6366f1;color:#fff;
              padding:12px 24px;border-radius:6px;text-decoration:none;
              font-weight:600;margin:16px 0;">
      Otevřít požadavek
    </a>` : ''}

    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">
      Tento email byl odeslán systémem ifmio. Neodpovídejte na něj.
    </p>
  </div>
</body>
</html>`
  }
}
