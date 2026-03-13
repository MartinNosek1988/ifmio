import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

const DAY_MS = 86_400_000

export interface NextAction {
  action: 'create_protocol' | 'complete_protocol' | 'sign_protocol' | 'confirm_protocol' | 'schedule_revision' | 'escalate'
  label: string
  description: string
  targetEntityType?: 'Protocol' | 'RevisionEvent' | 'RevisionPlan'
  targetEntityId?: string
}

/**
 * Computes the next required action for a given compliance status.
 * Used by both the API (getPlan response) and the escalation cron.
 */
export function computeNextAction(
  complianceStatus: string,
  protocolInfo?: { id: string; status: string } | null,
): NextAction | null {
  switch (complianceStatus) {
    case 'performed_pending_protocol':
      return {
        action: 'create_protocol',
        label: 'Vytvořit protokol',
        description: 'Revize byla provedena, ale chybí revizní protokol. Vytvořte nebo nahrajte protokol.',
      }

    case 'performed_unconfirmed':
      if (protocolInfo?.status === 'draft') {
        return {
          action: 'complete_protocol',
          label: 'Dokončit protokol',
          description: 'Protokol je ve stavu koncept. Doplňte údaje a dokončete jej.',
          targetEntityType: 'Protocol',
          targetEntityId: protocolInfo.id,
        }
      }
      return {
        action: 'confirm_protocol',
        label: 'Potvrdit protokol',
        description: 'Protokol je dokončen, ale nebyl potvrzen. Zkontrolujte a potvrďte protokol.',
        targetEntityType: 'Protocol',
        targetEntityId: protocolInfo?.id,
      }

    case 'performed_pending_signature':
      return {
        action: 'sign_protocol',
        label: 'Doplnit podpis',
        description: 'Protokol čeká na podpis. Nahrajte podepsaný dokument nebo doplňte jméno podepisujícího.',
        targetEntityType: 'Protocol',
        targetEntityId: protocolInfo?.id,
      }

    case 'overdue':
      return {
        action: 'schedule_revision',
        label: 'Naplánovat revizi',
        description: 'Revize je po termínu. Naplánujte a proveďte revizi co nejdříve.',
      }

    case 'overdue_critical':
      return {
        action: 'escalate',
        label: 'Eskalovat',
        description: 'Revize je kriticky po termínu (>30 dní). Vyžaduje okamžitou pozornost a eskalaci.',
      }

    case 'due_soon':
      return {
        action: 'schedule_revision',
        label: 'Naplánovat revizi',
        description: 'Termín revize se blíží. Naplánujte provedení revize včas.',
      }

    default:
      return null
  }
}

@Injectable()
export class RevisionEscalationService {
  private readonly logger = new Logger(RevisionEscalationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Scan all tenants and escalate revision compliance issues.
   * Called by CronService every 6 hours.
   */
  async escalateComplianceIssues() {
    const now = new Date()
    let checked = 0
    let escalated = 0

    // Get all tenants with active revision plans
    const tenants = await this.prisma.revisionPlan.findMany({
      where: { status: 'active' },
      select: { tenantId: true },
      distinct: ['tenantId'],
    })

    for (const { tenantId } of tenants) {
      const result = await this.escalateTenant(tenantId, now)
      checked += result.checked
      escalated += result.escalated
    }

    return { checked, escalated }
  }

  private async escalateTenant(tenantId: string, now: Date) {
    let checked = 0
    let escalated = 0

    // 1. Overdue critical plans (>30 days) — escalate
    const criticalPlans = await this.prisma.revisionPlan.findMany({
      where: {
        tenantId,
        status: 'active',
        nextDueAt: { lt: new Date(now.getTime() - 30 * DAY_MS) },
      },
      include: {
        revisionType: { select: { name: true } },
        property: { select: { name: true } },
        responsibleUser: { select: { name: true } },
      },
      take: 50,
    })

    for (const plan of criticalPlans) {
      checked++
      const dedup = `revision_overdue_critical:${plan.id}`
      const exists = await this.prisma.notification.findFirst({
        where: { tenantId, entityId: dedup },
        select: { id: true },
      })
      if (exists) continue

      const daysOverdue = Math.floor((now.getTime() - new Date(plan.nextDueAt).getTime()) / DAY_MS)

      await this.notifications.createForTenant(tenantId, {
        type: 'revision_overdue_critical',
        title: `Kriticky po termínu: ${plan.title}`,
        body: `${plan.revisionType.name} — ${daysOverdue} dní po termínu${plan.property ? ` (${plan.property.name})` : ''}`,
        entityId: dedup,
        entityType: 'RevisionPlan',
        url: '/revisions',
      })

      // Audit trail
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'REVISION_ESCALATED',
          entity: 'RevisionPlan',
          entityId: plan.id,
          newData: {
            complianceStatus: 'overdue_critical',
            daysOverdue,
            revisionType: plan.revisionType.name,
            responsibleUser: plan.responsibleUser?.name,
          },
        },
      })

      escalated++
    }

    // 2. Protocol-pending plans past grace period — remind
    const plansWithProtocolReq = await this.prisma.revisionPlan.findMany({
      where: {
        tenantId,
        status: 'active',
        revisionType: { requiresProtocol: true },
      },
      include: {
        revisionType: { select: { name: true, graceDaysAfterEvent: true } },
        property: { select: { name: true } },
      },
      take: 100,
    })

    for (const plan of plansWithProtocolReq) {
      checked++

      // Find latest event
      const latestEvent = await this.prisma.revisionEvent.findFirst({
        where: { revisionPlanId: plan.id, performedAt: { not: null } },
        orderBy: { performedAt: 'desc' },
        select: { id: true, performedAt: true },
      })
      if (!latestEvent?.performedAt) continue

      // Check if protocol exists
      const protocol = await this.prisma.protocol.findFirst({
        where: { tenantId, sourceType: 'revision', sourceId: latestEvent.id },
        select: { id: true, status: true },
      })

      const daysSinceEvent = Math.floor((now.getTime() - new Date(latestEvent.performedAt).getTime()) / DAY_MS)
      const graceDays = plan.revisionType.graceDaysAfterEvent

      // Only escalate if past grace period
      if (daysSinceEvent <= graceDays) continue

      if (!protocol) {
        // Protocol missing past grace period
        const dedup = `revision_protocol_overdue:${latestEvent.id}`
        const exists = await this.prisma.notification.findFirst({
          where: { tenantId, entityId: dedup },
          select: { id: true },
        })
        if (!exists) {
          await this.notifications.createForTenant(tenantId, {
            type: 'revision_protocol_overdue',
            title: `Protokol po termínu: ${plan.revisionType.name}`,
            body: `${daysSinceEvent} dní od provedení revize, grace period ${graceDays} dní překročen${plan.property ? ` (${plan.property.name})` : ''}`,
            entityId: dedup,
            entityType: 'RevisionEvent',
            url: '/revisions',
          })
          escalated++
        }
      } else if (protocol.status === 'draft' || protocol.status === 'completed') {
        // Protocol exists but not confirmed past grace period
        const dedup = `revision_protocol_unconfirmed_overdue:${protocol.id}`
        const exists = await this.prisma.notification.findFirst({
          where: { tenantId, entityId: dedup },
          select: { id: true },
        })
        if (!exists) {
          await this.notifications.createForTenant(tenantId, {
            type: 'revision_protocol_unconfirmed_overdue',
            title: `Nepotvrzený protokol po termínu: ${plan.revisionType.name}`,
            body: `Protokol ve stavu "${protocol.status}" — ${daysSinceEvent} dní od provedení${plan.property ? ` (${plan.property.name})` : ''}`,
            entityId: dedup,
            entityType: 'Protocol',
            url: '/protocols',
          })
          escalated++
        }
      }
    }

    return { checked, escalated }
  }
}
