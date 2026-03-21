import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types';

export type NotificationType =
  | 'reminder_due'
  | 'new_debtor'
  | 'unit_vacant'
  | 'ticket_new'
  | 'ticket_due_soon'
  | 'ticket_overdue'
  | 'ticket_escalated'
  | 'payment_unmatched'
  | 'contract_expiring'
  | 'meter_calibration'
  | 'payment_due'
  | 'protocol_missing'
  | 'protocol_pending_signature'
  | 'protocol_dissatisfaction'
  | 'revision_protocol_missing'
  | 'revision_overdue_critical'
  | 'revision_protocol_overdue'
  | 'revision_protocol_unconfirmed_overdue'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'

export interface CreateNotificationDto {
  tenantId: string
  userId?: string
  type: NotificationType
  title: string
  body: string
  entityId?: string
  entityType?: string
  url?: string
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto })
  }

  async createForTenant(
    tenantId: string,
    dto: Omit<CreateNotificationDto, 'tenantId' | 'userId'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    })

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        ...dto,
        tenantId,
        userId: u.id,
      })),
    })
  }

  async list(user: AuthUser, unreadOnly = false, type?: string) {
    const where: any = {
      tenantId: user.tenantId,
      OR: [{ userId: user.id }, { userId: null }],
    }
    if (unreadOnly) where.isRead = false
    if (type && type !== 'all') where.type = type

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async unreadCount(user: AuthUser): Promise<number> {
    return this.prisma.notification.count({
      where: {
        tenantId: user.tenantId,
        isRead: false,
        OR: [{ userId: user.id }, { userId: null }],
      },
    })
  }

  async markRead(user: AuthUser, id: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
      },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async markAllRead(user: AuthUser) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        isRead: false,
        OR: [{ userId: user.id }, { userId: null }],
      },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async remove(user: AuthUser, id: string) {
    await this.prisma.notification.deleteMany({
      where: {
        id,
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
      },
    })
    return { success: true }
  }

  async deleteOld(tenantId: string, daysOld = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)
    return this.prisma.notification.deleteMany({
      where: {
        tenantId,
        isRead: true,
        createdAt: { lt: cutoff },
      },
    })
  }

  // ─── Auto-generation ──────────────────────────────────────────

  async generateAutoNotifications(tenantId: string) {
    const now = new Date()
    const d7 = new Date(now)
    d7.setDate(d7.getDate() + 7)
    const d30 = new Date(now)
    d30.setDate(d30.getDate() + 30)

    let generated = 0

    // 1. Expiring contracts (30 days and 7 days)
    const expiringLeases = await this.prisma.leaseAgreement.findMany({
      where: {
        tenantId,
        status: 'aktivni',
        endDate: { gte: now, lte: d30 },
      },
      include: {
        property: { select: { name: true } },
        resident: { select: { firstName: true, lastName: true } },
      },
    })

    for (const la of expiringLeases) {
      const days = Math.ceil((la.endDate!.getTime() - now.getTime()) / 86_400_000)
      const dedup = `contract_expiring:${la.id}:${days <= 7 ? '7d' : '30d'}`
      const exists = await this.prisma.notification.findFirst({
        where: { tenantId, entityId: dedup, type: 'contract_expiring' },
      })
      if (exists) continue

      const resName = la.resident
        ? `${la.resident.firstName} ${la.resident.lastName}`
        : ''
      await this.createForTenant(tenantId, {
        type: 'contract_expiring' as NotificationType,
        title: `Smlouva expiruje za ${days} dni`,
        body: `${la.contractNumber || resName || 'Bez cisla'}${la.property ? ` — ${la.property.name}` : ''}`,
        entityId: dedup,
        entityType: 'LeaseAgreement',
        url: '/contracts',
      })
      generated++
    }

    // 2. Meter calibrations due
    const meters = await this.prisma.meter.findMany({
      where: {
        tenantId,
        isActive: true,
        calibrationDue: { lte: d30 },
      },
      include: { property: { select: { name: true } } },
    })

    for (const m of meters) {
      const overdue = m.calibrationDue! < now
      const days = Math.abs(Math.ceil((m.calibrationDue!.getTime() - now.getTime()) / 86_400_000))
      const dedup = `meter_calibration:${m.id}:${overdue ? 'overdue' : 'due'}`
      const exists = await this.prisma.notification.findFirst({
        where: { tenantId, entityId: dedup, type: 'meter_calibration' },
      })
      if (exists) continue

      await this.createForTenant(tenantId, {
        type: 'meter_calibration' as NotificationType,
        title: overdue
          ? `Prosla kalibrace: ${m.name}`
          : `Kalibrace za ${days} dni: ${m.name}`,
        body: `${m.serialNumber}${m.property ? ` — ${m.property.name}` : ''}`,
        entityId: dedup,
        entityType: 'Meter',
        url: '/meters',
      })
      generated++
    }

    // 3. Overdue work orders
    const overdueWO = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ['uzavrena', 'zrusena'] },
        deadline: { lt: now },
      },
      take: 20,
    })

    for (const wo of overdueWO) {
      const days = Math.ceil((now.getTime() - wo.deadline!.getTime()) / 86_400_000)
      const dedup = `wo_overdue:${wo.id}`
      const exists = await this.prisma.notification.findFirst({
        where: { tenantId, entityId: dedup, type: 'warning' },
      })
      if (exists) continue

      await this.createForTenant(tenantId, {
        type: 'warning' as NotificationType,
        title: `WO po terminu (${days} dni): ${wo.title}`,
        body: wo.description?.slice(0, 100) ?? '',
        entityId: dedup,
        entityType: 'WorkOrder',
        url: '/workorders',
      })
      generated++
    }

    // 4. Resolved helpdesk tickets without protocol
    const resolvedTickets = await this.prisma.helpdeskTicket.findMany({
      where: {
        tenantId,
        status: { in: ['resolved', 'closed'] },
        resolvedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
      },
      select: { id: true, number: true, title: true },
      take: 50,
    })

    for (const ticket of resolvedTickets) {
      const hasProtocol = await this.prisma.protocol.findFirst({
        where: { tenantId, sourceType: 'helpdesk', sourceId: ticket.id },
        select: { id: true },
      })
      if (hasProtocol) continue

      await this.notifyProtocolMissing({
        tenantId,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
      })
      generated++
    }

    // 5. Completed protocols without signatures
    const unsignedProtocols = await this.prisma.protocol.findMany({
      where: {
        tenantId,
        status: 'completed',
        OR: [
          { supplierSignatureName: null },
          { customerSignatureName: null },
        ],
      },
      select: { id: true, number: true },
      take: 50,
    })

    for (const proto of unsignedProtocols) {
      await this.notifyProtocolPendingSignature({
        tenantId,
        protocolId: proto.id,
        protocolNumber: proto.number,
      })
      generated++
    }

    // 6. Completed revision events without protocol
    const revisionEvents = await this.prisma.revisionEvent.findMany({
      where: {
        tenantId,
        resultStatus: { in: ['passed', 'passed_with_notes', 'failed'] },
        performedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
      },
      select: {
        id: true,
        revisionPlan: {
          select: {
            revisionType: { select: { name: true } },
            property: { select: { name: true } },
          },
        },
      },
      take: 50,
    })

    for (const event of revisionEvents) {
      const hasProtocol = await this.prisma.protocol.findFirst({
        where: { tenantId, sourceType: 'revision', sourceId: event.id },
        select: { id: true },
      })
      if (hasProtocol) continue

      await this.notifyRevisionProtocolMissing({
        tenantId,
        eventId: event.id,
        revisionTypeName: event.revisionPlan?.revisionType?.name ?? 'Revize',
        propertyName: event.revisionPlan?.property?.name ?? undefined,
      })
      generated++
    }

    // 7. Clean old read notifications
    await this.deleteOld(tenantId)

    return { generated, cleaned: true }
  }

  // ─── Existing trigger helpers ─────────────────────────────────

  async notifyNewReminder(params: {
    tenantId: string
    residentName: string
    amount: number
    level: string
    reminderId: string
  }) {
    const levelLabel =
      params.level === 'first'
        ? '1. upomínka'
        : params.level === 'second'
          ? '2. upomínka'
          : '3. upomínka'

    await this.createForTenant(params.tenantId, {
      type: 'reminder_due',
      title: `Nova upominka — ${params.residentName}`,
      body: `${levelLabel} na ${params.amount.toLocaleString('cs-CZ')} Kc`,
      entityId: params.reminderId,
      entityType: 'Reminder',
      url: '/finance',
    })
  }

  async notifyUnmatchedPayment(params: {
    tenantId: string
    amount: number
    vs?: string
    txId: string
  }) {
    await this.createForTenant(params.tenantId, {
      type: 'payment_unmatched',
      title: 'Nesparovana platba',
      body: `${params.amount.toLocaleString('cs-CZ')} Kc${params.vs ? ` (VS: ${params.vs})` : ''}`,
      entityId: params.txId,
      entityType: 'BankTransaction',
      url: '/finance',
    })
  }

  async notifyNewTicket(params: {
    tenantId: string
    ticketTitle: string
    ticketId: string
    protocol: string
  }) {
    await this.createForTenant(params.tenantId, {
      type: 'ticket_new',
      title: 'Novy helpdesk ticket',
      body: `${params.protocol}: ${params.ticketTitle}`,
      entityId: params.ticketId,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })
  }

  async notifyTicketDueSoon(params: {
    tenantId: string
    ticketId: string
    ticketNumber: number
    ticketTitle: string
    hoursLeft: number
    assigneeId?: string | null
  }) {
    const dedup = `ticket_due_soon:${params.ticketId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'ticket_due_soon' },
    })
    if (exists) return

    const num = `HD-${String(params.ticketNumber).padStart(4, '0')}`
    await this.create({
      tenantId: params.tenantId,
      userId: params.assigneeId ?? undefined,
      type: 'ticket_due_soon',
      title: `SLA blizi se termin: ${num}`,
      body: `${params.ticketTitle} — zbyvá ${params.hoursLeft}h`,
      entityId: dedup,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })
    // Also broadcast to tenant if no specific assignee
    if (!params.assigneeId) {
      await this.createForTenant(params.tenantId, {
        type: 'ticket_due_soon',
        title: `SLA blizi se termin: ${num}`,
        body: `${params.ticketTitle} — zbyvá ${params.hoursLeft}h`,
        entityId: dedup,
        entityType: 'HelpdeskTicket',
        url: '/helpdesk',
      })
    }
  }

  async notifyTicketOverdue(params: {
    tenantId: string
    ticketId: string
    ticketNumber: number
    ticketTitle: string
    assigneeId?: string | null
  }) {
    const dedup = `ticket_overdue:${params.ticketId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'ticket_overdue' },
    })
    if (exists) return

    const num = `HD-${String(params.ticketNumber).padStart(4, '0')}`
    await this.create({
      tenantId: params.tenantId,
      userId: params.assigneeId ?? undefined,
      type: 'ticket_overdue',
      title: `SLA prekroceno: ${num}`,
      body: params.ticketTitle,
      entityId: dedup,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })
    if (!params.assigneeId) {
      await this.createForTenant(params.tenantId, {
        type: 'ticket_overdue',
        title: `SLA prekroceno: ${num}`,
        body: params.ticketTitle,
        entityId: dedup,
        entityType: 'HelpdeskTicket',
        url: '/helpdesk',
      })
    }
  }

  async notifyTicketEscalated(params: {
    tenantId: string
    ticketId: string
    ticketNumber: number
    ticketTitle: string
    escalationLevel: number
  }) {
    const dedup = `ticket_escalated:${params.ticketId}:L${params.escalationLevel}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'ticket_escalated' },
    })
    if (exists) return

    const num = `HD-${String(params.ticketNumber).padStart(4, '0')}`
    await this.createForTenant(params.tenantId, {
      type: 'ticket_escalated',
      title: `Eskalace L${params.escalationLevel}: ${num}`,
      body: params.ticketTitle,
      entityId: dedup,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })
  }

  // ─── Protocol notification helpers ──────────────────────────────

  async notifyProtocolMissing(params: {
    tenantId: string
    ticketId: string
    ticketNumber: number
    ticketTitle: string
  }) {
    const dedup = `protocol_missing:${params.ticketId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'protocol_missing' },
    })
    if (exists) return

    const num = `HD-${String(params.ticketNumber).padStart(4, '0')}`
    await this.createForTenant(params.tenantId, {
      type: 'protocol_missing',
      title: `Chybí protokol: ${num}`,
      body: params.ticketTitle,
      entityId: dedup,
      entityType: 'HelpdeskTicket',
      url: '/helpdesk',
    })
  }

  /** Dismiss (delete) notifications matching an entityId pattern */
  async dismissByEntityId(tenantId: string, entityId: string) {
    await this.prisma.notification.deleteMany({
      where: { tenantId, entityId },
    })
  }

  async notifyProtocolPendingSignature(params: {
    tenantId: string
    protocolId: string
    protocolNumber: string
  }) {
    const dedup = `protocol_pending_signature:${params.protocolId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'protocol_pending_signature' },
    })
    if (exists) return

    await this.createForTenant(params.tenantId, {
      type: 'protocol_pending_signature',
      title: `Protokol čeká na podpis: ${params.protocolNumber}`,
      body: 'Dokončený protokol bez podpisu dodavatele nebo odběratele',
      entityId: dedup,
      entityType: 'Protocol',
      url: '/protocols',
    })
  }

  async notifyProtocolDissatisfaction(params: {
    tenantId: string
    protocolId: string
    protocolNumber: string
    satisfactionComment?: string
  }) {
    const dedup = `protocol_dissatisfaction:${params.protocolId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'protocol_dissatisfaction' },
    })
    if (exists) return

    await this.createForTenant(params.tenantId, {
      type: 'protocol_dissatisfaction',
      title: `Nespokojenost: ${params.protocolNumber}`,
      body: params.satisfactionComment || 'Odběratel vyjádřil nespokojenost s provedenými pracemi',
      entityId: dedup,
      entityType: 'Protocol',
      url: '/protocols',
    })
  }

  async notifyRevisionProtocolMissing(params: {
    tenantId: string
    eventId: string
    revisionTypeName: string
    propertyName?: string
  }) {
    const dedup = `revision_protocol_missing:${params.eventId}`
    const exists = await this.prisma.notification.findFirst({
      where: { tenantId: params.tenantId, entityId: dedup, type: 'revision_protocol_missing' },
    })
    if (exists) return

    await this.createForTenant(params.tenantId, {
      type: 'revision_protocol_missing',
      title: `Chybí revizní protokol: ${params.revisionTypeName}`,
      body: params.propertyName ? `Nemovitost: ${params.propertyName}` : 'Revizní událost bez přiřazeného protokolu',
      entityId: dedup,
      entityType: 'RevisionEvent',
      url: '/revisions',
    })
  }
}
