import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface AuthUser {
  id: string
  tenantId: string
  role: string
}

export type NotificationType =
  | 'reminder_due'
  | 'new_debtor'
  | 'unit_vacant'
  | 'ticket_new'
  | 'payment_unmatched'
  | 'info'

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

  async list(user: AuthUser, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

  // ─── Automatické notifikace ───────────────────────────────────

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
}
