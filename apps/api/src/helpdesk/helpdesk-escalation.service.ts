import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/** Max escalation level — stops auto-escalating beyond this */
const MAX_ESCALATION_LEVEL = 5

/**
 * Singleton service for SLA escalation logic.
 * Separated from HelpdeskService (request-scoped) so that
 * CronService and tests can consume it without scope issues.
 */
@Injectable()
export class HelpdeskEscalationService {
  private readonly logger = new Logger(HelpdeskEscalationService.name)

  constructor(private readonly prisma: PrismaService) {}

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

      escalated++
    }

    return { checked: overdue.length, escalated }
  }
}
