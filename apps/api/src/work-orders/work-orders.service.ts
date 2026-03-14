import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { EmailService } from '../email/email.service'
import type { AuthUser } from '@ifmio/shared-types'

const USER_SELECT = { id: true, name: true, email: true } as const

const STATUS_LABELS: Record<string, string> = {
  nova: 'Nový', v_reseni: 'V řešení', vyresena: 'Vyřešený', uzavrena: 'Uzavřený', zrusena: 'Zrušený',
}
const PRIORITY_LABELS: Record<string, string> = {
  nizka: 'Nízká', normalni: 'Normální', vysoka: 'Vysoká', kriticka: 'Kritická',
}

function serialize(item: any) {
  return {
    ...item,
    laborCost: item.laborCost ? Number(item.laborCost) : null,
    materialCost: item.materialCost ? Number(item.materialCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    deadline: item.deadline?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private email: EmailService,
  ) {}

  private readonly woInclude = {
    property:       { select: { id: true, name: true } },
    unit:           { select: { id: true, name: true, area: true } },
    asset:          { select: { id: true, name: true } },
    assigneeUser:   { select: USER_SELECT },
    requesterUser:  { select: USER_SELECT },
    dispatcherUser: { select: USER_SELECT },
    helpdeskTicket: { select: { id: true, number: true, title: true, status: true } },
    comments:       { orderBy: { createdAt: 'desc' as const } },
  } as const

  async list(
    user: AuthUser,
    query: { status?: string; priority?: string; propertyId?: string; search?: string },
  ) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: any = { tenantId: user.tenantId, ...scopeWhere }

    if (query.status && query.status !== 'all') where.status = query.status
    if (query.priority && query.priority !== 'all') where.priority = query.priority
    if (query.propertyId) where.propertyId = query.propertyId
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { assignee: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const items = await this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.woInclude,
    })

    return items.map(serialize)
  }

  async getStats(user: AuthUser) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const base = { tenantId, ...scopeWhere }
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const [total, open, completedToday, overdue] = await Promise.all([
      this.prisma.workOrder.count({ where: base as any }),
      this.prisma.workOrder.count({
        where: { ...base, status: { in: ['nova', 'v_reseni'] } } as any,
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          status: { in: ['vyresena', 'uzavrena'] },
          completedAt: { gte: todayStart, lt: todayEnd },
        } as any,
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          status: { in: ['nova', 'v_reseni'] },
          deadline: { lt: now },
        } as any,
      }),
    ])

    return { total, open, completedToday, overdue }
  }

  async getById(user: AuthUser, id: string) {
    const item = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: this.woInclude,
    })

    if (!item) throw new NotFoundException('Pracovní úkol nenalezen')
    await this.scope.verifyEntityAccess(user, item.propertyId)
    return serialize(item)
  }

  async create(user: AuthUser, dto: {
    title: string
    description?: string
    workType?: string
    priority?: string
    propertyId?: string
    unitId?: string
    assetId?: string
    helpdeskTicketId?: string
    assignee?: string
    requester?: string
    assigneeUserId?: string
    requesterUserId?: string
    dispatcherUserId?: string
    deadline?: string
    estimatedHours?: number
    laborCost?: number
    materialCost?: number
    note?: string
  }) {
    if (dto.propertyId) await this.scope.verifyPropertyAccess(user, dto.propertyId)
    if (dto.assetId) await this.verifyAssetAccess(user, dto.assetId)
    if (dto.helpdeskTicketId) await this.verifyTicketAccess(user, dto.helpdeskTicketId)
    if (dto.assigneeUserId) await this.verifyUserAccess(user, dto.assigneeUserId)
    if (dto.requesterUserId && dto.requesterUserId !== user.id) await this.verifyUserAccess(user, dto.requesterUserId)
    if (dto.dispatcherUserId) await this.verifyUserAccess(user, dto.dispatcherUserId)

    const totalCost = (dto.laborCost ?? 0) + (dto.materialCost ?? 0)

    const item = await this.prisma.workOrder.create({
      data: {
        tenantId:         user.tenantId,
        title:            dto.title,
        description:      dto.description,
        workType:         (dto.workType as any) ?? 'corrective',
        priority:         (dto.priority as any) ?? 'normalni',
        propertyId:       dto.propertyId || null,
        unitId:           dto.unitId || null,
        assetId:          dto.assetId || null,
        helpdeskTicketId: dto.helpdeskTicketId || null,
        assignee:         dto.assignee,
        requester:        dto.requester,
        assigneeUserId:   dto.assigneeUserId || null,
        requesterUserId:  dto.requesterUserId || user.id,
        dispatcherUserId: dto.dispatcherUserId || null,
        deadline:         dto.deadline ? new Date(dto.deadline) : null,
        estimatedHours:   dto.estimatedHours,
        laborCost:        dto.laborCost,
        materialCost:     dto.materialCost,
        totalCost:        totalCost > 0 ? totalCost : null,
        note:             dto.note,
      },
      include: this.woInclude,
    })

    const serialized = serialize(item)
    this.sendWoEmail(serialized, 'create').catch((err) =>
      this.logger.error(`WO email notification failed: ${err}`),
    )
    return serialized
  }

  async createFromTicket(user: AuthUser, ticketId: string, dto: {
    title?: string
    description?: string
    priority?: string
    assigneeUserId?: string
    dispatcherUserId?: string
    deadline?: string
    note?: string
  }) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId },
      include: { property: { select: { id: true } }, asset: { select: { id: true } } },
    })
    if (!ticket) throw new NotFoundException('Požadavek nenalezen')
    await this.scope.verifyEntityAccess(user, ticket.propertyId)

    if (dto.assigneeUserId) await this.verifyUserAccess(user, dto.assigneeUserId)
    if (dto.dispatcherUserId) await this.verifyUserAccess(user, dto.dispatcherUserId)

    const priorityMap: Record<string, string> = {
      low: 'nizka', medium: 'normalni', high: 'vysoka', urgent: 'kriticka',
    }

    const item = await this.prisma.workOrder.create({
      data: {
        tenantId:         user.tenantId,
        title:            dto.title || ticket.title,
        description:      dto.description || ticket.description || undefined,
        priority:         (dto.priority ?? priorityMap[ticket.priority] ?? 'normalni') as any,
        propertyId:       ticket.propertyId,
        unitId:           ticket.unitId,
        assetId:          ticket.assetId,
        helpdeskTicketId: ticketId,
        requesterUserId:  ticket.requesterUserId || user.id,
        assigneeUserId:   dto.assigneeUserId || ticket.assigneeId || null,
        dispatcherUserId: dto.dispatcherUserId || ticket.dispatcherUserId || null,
        deadline:         dto.deadline ? new Date(dto.deadline) : null,
        note:             dto.note,
      },
      include: this.woInclude,
    })

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'WO_CREATED_FROM_TICKET',
        entity: 'WorkOrder',
        entityId: item.id,
        newData: { helpdeskTicketId: ticketId, ticketNumber: ticket.number },
      },
    }).catch(() => {})

    const serialized = serialize(item)
    this.sendWoEmail(serialized, 'create').catch((err) =>
      this.logger.error(`WO email notification failed: ${err}`),
    )
    return serialized
  }

  async listForTicket(user: AuthUser, ticketId: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId },
      select: { id: true, propertyId: true },
    })
    if (!ticket) throw new NotFoundException('Požadavek nenalezen')
    await this.scope.verifyEntityAccess(user, ticket.propertyId)

    const items = await this.prisma.workOrder.findMany({
      where: { helpdeskTicketId: ticketId, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: this.woInclude,
    })
    return items.map(serialize)
  }

  async update(user: AuthUser, id: string, dto: {
    title?: string
    description?: string
    workType?: string
    priority?: string
    propertyId?: string
    unitId?: string
    assetId?: string
    assignee?: string
    requester?: string
    assigneeUserId?: string
    requesterUserId?: string
    dispatcherUserId?: string
    deadline?: string
    estimatedHours?: number
    actualHours?: number
    laborCost?: number
    materialCost?: number
    note?: string
  }) {
    const existing = await this.getById(user, id)
    const data: any = {}
    const changes: { field: string; oldValue: string; newValue: string }[] = []

    for (const key of ['title', 'description', 'workType', 'propertyId', 'unitId', 'assignee', 'requester', 'note'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] || null
    }

    if (dto.assetId !== undefined && dto.assetId !== existing.assetId) {
      if (dto.assetId) await this.verifyAssetAccess(user, dto.assetId)
      data.assetId = dto.assetId || null
      changes.push({ field: 'Zařízení', oldValue: existing.asset?.name ?? '—', newValue: dto.assetId ? '(změněno)' : '—' })
    }

    if (dto.assigneeUserId !== undefined && dto.assigneeUserId !== existing.assigneeUserId) {
      let name = '—'
      if (dto.assigneeUserId) { const u = await this.verifyUserAccess(user, dto.assigneeUserId); name = u.name }
      data.assigneeUserId = dto.assigneeUserId || null
      changes.push({ field: 'Řešitel úkolu', oldValue: existing.assigneeUser?.name ?? '—', newValue: name })
    }
    if (dto.dispatcherUserId !== undefined && dto.dispatcherUserId !== existing.dispatcherUserId) {
      let name = '—'
      if (dto.dispatcherUserId) { const u = await this.verifyUserAccess(user, dto.dispatcherUserId); name = u.name }
      data.dispatcherUserId = dto.dispatcherUserId || null
      changes.push({ field: 'Dispečer úkolu', oldValue: existing.dispatcherUser?.name ?? '—', newValue: name })
    }
    if (dto.requesterUserId !== undefined && dto.requesterUserId !== existing.requesterUserId) {
      if (dto.requesterUserId) await this.verifyUserAccess(user, dto.requesterUserId)
      data.requesterUserId = dto.requesterUserId || null
    }

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      data.priority = dto.priority
      changes.push({
        field: 'Priorita',
        oldValue: PRIORITY_LABELS[existing.priority] ?? existing.priority,
        newValue: PRIORITY_LABELS[dto.priority] ?? dto.priority,
      })
    }

    if (dto.deadline !== undefined) {
      data.deadline = dto.deadline ? new Date(dto.deadline) : null
      changes.push({
        field: 'Termín realizace',
        oldValue: existing.deadline ? new Date(existing.deadline).toLocaleDateString('cs-CZ') : '—',
        newValue: dto.deadline ? new Date(dto.deadline).toLocaleDateString('cs-CZ') : '—',
      })
    }

    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours
    if (dto.actualHours !== undefined) data.actualHours = dto.actualHours
    if (dto.laborCost !== undefined) data.laborCost = dto.laborCost
    if (dto.materialCost !== undefined) data.materialCost = dto.materialCost

    if (dto.laborCost !== undefined || dto.materialCost !== undefined) {
      const labor = dto.laborCost ?? (existing.laborCost ?? 0)
      const material = dto.materialCost ?? (existing.materialCost ?? 0)
      data.totalCost = labor + material
    }

    if (Object.keys(data).length === 0) return existing

    const item = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: this.woInclude,
    })

    const serialized = serialize(item)
    if (changes.length > 0) {
      this.sendWoEmail(serialized, 'update', changes).catch((err) =>
        this.logger.error(`WO email notification failed: ${err}`),
      )
    }
    return serialized
  }

  async changeStatus(user: AuthUser, id: string, status: string) {
    const existing = await this.getById(user, id)

    const data: any = { status }
    if (status === 'vyresena' || status === 'uzavrena') data.completedAt = new Date()
    if (status === 'nova' || status === 'v_reseni') data.completedAt = null

    const item = await this.prisma.workOrder.update({
      where: { id }, data,
      include: this.woInclude,
    })

    const serialized = serialize(item)
    this.sendWoEmail(serialized, 'update', [{
      field: 'Stav',
      oldValue: STATUS_LABELS[existing.status] ?? existing.status,
      newValue: STATUS_LABELS[status] ?? status,
    }]).catch((err) => this.logger.error(`WO email notification failed: ${err}`))
    return serialized
  }

  async addComment(user: AuthUser, id: string, text: string) {
    await this.getById(user, id)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }, select: { name: true },
    })
    const comment = await this.prisma.workOrderComment.create({
      data: { workOrderId: id, author: dbUser?.name ?? 'System', text },
    })
    return { ...comment, createdAt: comment.createdAt.toISOString() }
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id)
    await this.prisma.workOrder.delete({ where: { id } })
    return { success: true }
  }

  // ─── Access helpers ─────────────────────────────────────────

  private async verifyAssetAccess(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!asset) throw new NotFoundException('Zařízení nenalezeno')
  }

  private async verifyTicketAccess(user: AuthUser, ticketId: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId },
      select: { id: true },
    })
    if (!ticket) throw new NotFoundException('Požadavek nenalezen')
  }

  private async verifyUserAccess(user: AuthUser, userId: string): Promise<{ id: string; name: string }> {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
    })
    if (!target) throw new BadRequestException('Uživatel nenalezen nebo není aktivní')
    return target
  }

  // ─── Email ──────────────────────────────────────────────────

  private async sendWoEmail(
    wo: any, event: 'create' | 'update',
    changes?: { field: string; oldValue: string; newValue: string }[],
  ) {
    const emails = new Set<string>()
    if (wo.assigneeUser?.email) emails.add(wo.assigneeUser.email)
    if (wo.dispatcherUser?.email) emails.add(wo.dispatcherUser.email)
    if (wo.requesterUser?.email) emails.add(wo.requesterUser.email)
    if (emails.size === 0) return

    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : '')
    const woUrl = frontendUrl ? `${frontendUrl}/workorders` : ''
    const title = wo.title
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    let subject: string
    if (event === 'create') {
      subject = `Nový pracovní úkol: ${title}`
    } else {
      const sc = changes?.find((c) => c.field === 'Stav')
      if (sc && (sc.newValue === 'Vyřešený' || sc.newValue === 'Uzavřený')) subject = `Úkol dokončen: ${title}`
      else if (sc) subject = `Změna stavu úkolu: ${title} (${sc.oldValue} → ${sc.newValue})`
      else subject = `Změna úkolu: ${title}`
    }

    let changesHtml = ''
    if (changes?.length) {
      const rows = changes.map((c) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">${esc(c.field)}</td><td style="padding:4px 12px;color:#6b7280;">${esc(c.oldValue)}</td><td style="padding:4px 0;">→ <strong>${esc(c.newValue)}</strong></td></tr>`,
      ).join('')
      changesHtml = `<div style="margin:16px 0;"><div style="font-weight:600;margin-bottom:6px;">Změněné údaje:</div><table style="font-size:0.9rem;">${rows}</table></div>`
    }

    const ticketLine = wo.helpdeskTicket ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Navázaný požadavek</td><td style="padding:4px 0;">HD-${String(wo.helpdeskTicket.number).padStart(4, '0')} ${esc(wo.helpdeskTicket.title)}</td></tr>` : ''
    const assetLine = wo.asset?.name ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Zařízení</td><td style="padding:4px 0;">${esc(wo.asset.name)}</td></tr>` : ''
    const heading = event === 'create' ? 'Nový pracovní úkol' : 'Změna pracovního úkolu'

    const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;">
  <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0;"><h1 style="color:#fff;margin:0;font-size:20px;">ifmio</h1></div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">${esc(heading)}</h2>
    <p style="font-size:1.1rem;font-weight:600;">${esc(title)}</p>
    <table style="font-size:0.9rem;margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Stav</td><td>${esc(STATUS_LABELS[wo.status] ?? wo.status)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Priorita</td><td>${esc(PRIORITY_LABELS[wo.priority] ?? wo.priority)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Termín</td><td>${esc(wo.deadline ? new Date(wo.deadline).toLocaleDateString('cs-CZ') : '—')}</td></tr>
      ${assetLine}${ticketLine}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Dispečer</td><td>${esc(wo.dispatcherUser?.name ?? '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Řešitel</td><td>${esc(wo.assigneeUser?.name ?? wo.assignee ?? '—')}</td></tr>
    </table>
    ${changesHtml}
    ${woUrl ? `<a href="${encodeURI(woUrl)}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Otevřít úkol</a>` : ''}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">Tento email byl odeslán systémem ifmio.</p>
  </div>
</body></html>`

    for (const addr of emails) {
      try { await this.email.send({ to: addr, subject, html }) }
      catch (err) { this.logger.error(`WO email to ${addr} failed: ${err}`) }
    }
  }
}
