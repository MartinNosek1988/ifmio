import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

/** Max escalation level — stops auto-escalating beyond this */
const MAX_ESCALATION_LEVEL = 5
const TWENTY_FOUR_HOURS_MS = 24 * 3_600_000

/**
 * Singleton service for SLA escalation logic.
 * Separated from HelpdeskService (request-scoped) so that
 * CronService and tests can consume it without scope issues.
 */
@Injectable()
export class HelpdeskEscalationService {
  private readonly logger = new Logger(HelpdeskEscalationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async escalateOverdueTickets() {
    const now = new Date()

    // Find active tickets past resolution SLA that haven't hit max escalation
    const overdue = await this.prisma.helpdeskTicket.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        resolutionDueAt: { lt: now },
        escalationLevel: { lt: MAX_ESCALATION_LEVEL },
      },
      include: {
        property: { select: { id: true, name: true } },
      },
    })

    let escalated = 0
    for (const ticket of overdue) {
      const oldLevel = ticket.escalationLevel
      const newLevel = oldLevel + 1

      await this.prisma.helpdeskTicket.update({
        where: { id: ticket.id },
        data: {
          escalationLevel: newLevel,
          escalatedAt: now,
        },
      })

      // Audit log with old/new data
      await this.prisma.auditLog.create({
        data: {
          tenantId: ticket.tenantId,
          action: 'TICKET_ESCALATED',
          entity: 'HelpdeskTicket',
          entityId: ticket.id,
          oldData: {
            escalationLevel: oldLevel,
            propertyId: ticket.propertyId,
            priority: ticket.priority,
          },
          newData: {
            escalationLevel: newLevel,
            propertyId: ticket.propertyId,
            priority: ticket.priority,
          },
        },
      })

      // Notify — escalation (deduped per level)
      await this.notifications.notifyTicketEscalated({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        escalationLevel: newLevel,
      })

      // Notify — overdue (deduped, only once per ticket)
      if (oldLevel === 0) {
        await this.notifications.notifyTicketOverdue({
          tenantId: ticket.tenantId,
          ticketId: ticket.id,
          ticketNumber: ticket.number,
          ticketTitle: ticket.title,
          assigneeId: ticket.assigneeId,
        })
      }

      escalated++
    }

    return { checked: overdue.length, escalated }
  }

  async notifyDueSoonTickets() {
    const now = new Date()
    const soon = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS)

    // Active tickets with resolution due in the next 24h (not yet overdue)
    const dueSoon = await this.prisma.helpdeskTicket.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        resolutionDueAt: { gt: now, lt: soon },
      },
    })

    let notified = 0
    for (const ticket of dueSoon) {
      const hoursLeft = Math.round(
        (new Date(ticket.resolutionDueAt!).getTime() - now.getTime()) / 3_600_000,
      )

      await this.notifications.notifyTicketDueSoon({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        hoursLeft,
        assigneeId: ticket.assigneeId,
      })
      notified++
    }

    return { checked: dueSoon.length, notified }
  }
}
