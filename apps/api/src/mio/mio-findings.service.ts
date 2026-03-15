import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'

// Severity → Helpdesk priority mapping
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  warning: 'high',
  info: 'medium',
}

// Auto-ticket policy: which codes auto-create tickets
const AUTO_TICKET_CODES = new Set([
  'overdue_recurring_request',
  'overdue_revision',
  'overdue_work_order',
  'urgent_ticket_no_assignee',
])

interface FindingRule {
  code: string
  title: string
  severity: string
  run: (tenantId: string, prisma: PrismaService) => Promise<DetectedIssue[]>
}

interface DetectedIssue {
  fingerprint: string
  description: string
  entityType?: string
  entityId?: string
  entityCount?: number
  propertyId?: string
  actionLabel?: string
  actionUrl?: string
}

@Injectable()
export class MioFindingsService {
  private readonly logger = new Logger(MioFindingsService.name)

  constructor(private prisma: PrismaService) {}

  // ─── DETECTION SCAN ─────────────────────────────────────────

  async runDetection(): Promise<{ checked: number; created: number; resolved: number; ticketsCreated: number }> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    let totalCreated = 0, totalResolved = 0, totalTickets = 0

    for (const tenant of tenants) {
      try {
        const result = await this.runDetectionForTenant(tenant.id)
        totalCreated += result.created
        totalResolved += result.resolved
        totalTickets += result.ticketsCreated
      } catch (err) {
        this.logger.error(`Detection failed for tenant ${tenant.id}: ${err}`)
      }
    }

    return { checked: tenants.length, created: totalCreated, resolved: totalResolved, ticketsCreated: totalTickets }
  }

  private async runDetectionForTenant(tenantId: string) {
    const now = new Date()
    let created = 0, resolved = 0, ticketsCreated = 0

    const detectedFingerprints = new Set<string>()

    for (const rule of RULES) {
      try {
        const issues = await rule.run(tenantId, this.prisma)

        for (const issue of issues) {
          detectedFingerprints.add(issue.fingerprint)

          // Upsert finding
          const existing = await this.prisma.mioFinding.findUnique({
            where: { fingerprint: issue.fingerprint },
          })

          if (existing) {
            // Update lastDetectedAt, reactivate if was resolved/snoozed
            const update: Record<string, unknown> = { lastDetectedAt: now }
            if (existing.status === 'resolved') {
              update.status = 'active'
              update.resolvedAt = null
            }
            if (existing.status === 'snoozed' && existing.snoozedUntil && existing.snoozedUntil < now) {
              update.status = 'active'
              update.snoozedUntil = null
            }
            await this.prisma.mioFinding.update({ where: { id: existing.id }, data: update })
          } else {
            // Create new finding
            const finding = await this.prisma.mioFinding.create({
              data: {
                tenantId,
                propertyId: issue.propertyId ?? null,
                code: rule.code,
                title: rule.title,
                description: issue.description,
                severity: rule.severity,
                confidence: 'high',
                fingerprint: issue.fingerprint,
                entityType: issue.entityType ?? null,
                entityId: issue.entityId ?? null,
                entityCount: issue.entityCount ?? null,
                actionLabel: issue.actionLabel ?? null,
                actionUrl: issue.actionUrl ?? null,
                firstDetectedAt: now,
                lastDetectedAt: now,
              },
            })
            created++

            // Auto-ticket if policy says so
            if (AUTO_TICKET_CODES.has(rule.code) && rule.severity !== 'info') {
              const ticket = await this.createTicketForFinding(tenantId, finding)
              if (ticket) ticketsCreated++
            }
          }
        }
      } catch (err) {
        this.logger.error(`Rule ${rule.code} failed for tenant ${tenantId}: ${err}`)
      }
    }

    // Resolve findings no longer detected
    const activeFindings = await this.prisma.mioFinding.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, fingerprint: true },
    })
    for (const f of activeFindings) {
      if (!detectedFingerprints.has(f.fingerprint)) {
        await this.prisma.mioFinding.update({
          where: { id: f.id },
          data: { status: 'resolved', resolvedAt: now },
        })
        resolved++
      }
    }

    return { created, resolved, ticketsCreated }
  }

  private async createTicketForFinding(tenantId: string, finding: any): Promise<boolean> {
    // Don't create if finding already has a ticket
    if (finding.helpdeskTicketId) return false

    // Check if a ticket already exists for this finding
    const existingTicket = finding.helpdeskTicketId
      ? await this.prisma.helpdeskTicket.findFirst({ where: { id: finding.helpdeskTicketId, status: { in: ['open', 'in_progress'] } } })
      : null
    if (existingTicket) return false

    // Get next ticket number
    const last = await this.prisma.helpdeskTicket.findFirst({
      where: { tenantId },
      orderBy: { number: 'desc' },
      select: { number: true },
    })
    const number = (last?.number ?? 0) + 1

    const priority = SEVERITY_TO_PRIORITY[finding.severity] ?? 'medium'

    const ticket = await this.prisma.helpdeskTicket.create({
      data: {
        tenantId,
        number,
        title: `[Mio] ${finding.title}`,
        description: finding.description ?? `Automaticky vytvořeno na základě zjištění Mio.\n\nKód: ${finding.code}`,
        category: 'general' as any,
        priority: priority as any,
        propertyId: finding.propertyId,
        requestOrigin: 'mio_finding',
      },
    })

    await this.prisma.mioFinding.update({
      where: { id: finding.id },
      data: { helpdeskTicketId: ticket.id, ticketCreatedAutomatically: true },
    })

    this.logger.log(`Auto-ticket HD-${String(number).padStart(4, '0')} created for finding ${finding.code}`)
    return true
  }

  async runDetectionForUser(user: { tenantId: string }) {
    return this.runDetectionForTenant(user.tenantId)
  }

  // ─── API METHODS ────────────────────────────────────────────

  async listFindings(user: AuthUser, query?: { status?: string; severity?: string }) {
    const where: any = { tenantId: user.tenantId }
    if (query?.status) where.status = query.status
    if (query?.severity) where.severity = query.severity

    return this.prisma.mioFinding.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { lastDetectedAt: 'desc' }],
      take: 50,
    })
  }

  async getSummary(user: AuthUser) {
    const tenantId = user.tenantId
    const [critical, warning, info, total] = await Promise.all([
      this.prisma.mioFinding.count({ where: { tenantId, status: 'active', severity: 'critical' } }),
      this.prisma.mioFinding.count({ where: { tenantId, status: 'active', severity: 'warning' } }),
      this.prisma.mioFinding.count({ where: { tenantId, status: 'active', severity: 'info' } }),
      this.prisma.mioFinding.count({ where: { tenantId, status: 'active' } }),
    ])
    return { total, critical, warning, info }
  }

  async dismiss(user: AuthUser, id: string) {
    const finding = await this.prisma.mioFinding.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!finding) return null
    return this.prisma.mioFinding.update({
      where: { id },
      data: { status: 'dismissed', dismissedAt: new Date() },
    })
  }

  async snooze(user: AuthUser, id: string, until: Date) {
    const finding = await this.prisma.mioFinding.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!finding) return null
    return this.prisma.mioFinding.update({
      where: { id },
      data: { status: 'snoozed', snoozedUntil: until },
    })
  }

  async createTicketManual(user: AuthUser, id: string) {
    const finding = await this.prisma.mioFinding.findFirst({
      where: { id, tenantId: user.tenantId, status: 'active' },
    })
    if (!finding || finding.helpdeskTicketId) return null
    const ok = await this.createTicketForFinding(user.tenantId, finding)
    if (!ok) return null
    return this.prisma.mioFinding.findUnique({ where: { id } })
  }
}

// ─── DETECTION RULES ──────────────────────────────────────────

const RULES: FindingRule[] = [
  {
    code: 'overdue_recurring_request',
    title: 'Opakované požadavky jsou po termínu',
    severity: 'warning',
    run: async (tenantId, prisma) => {
      const now = new Date()
      const tickets = await prisma.helpdeskTicket.findMany({
        where: {
          tenantId,
          requestOrigin: 'recurring_plan',
          status: { in: ['open', 'in_progress'] },
          resolutionDueAt: { lt: now },
        },
        select: { id: true, number: true, title: true, propertyId: true },
        take: 20,
      })
      return tickets.map(t => ({
        fingerprint: `overdue_recurring:${tenantId}:${t.id}`,
        description: `HD-${String(t.number).padStart(4, '0')} ${t.title} je po termínu`,
        entityType: 'HelpdeskTicket',
        entityId: t.id,
        propertyId: t.propertyId ?? undefined,
        actionLabel: 'Otevřít požadavek',
        actionUrl: `/helpdesk`,
      }))
    },
  },
  {
    code: 'overdue_revision',
    title: 'Revize je po termínu',
    severity: 'critical',
    run: async (tenantId, prisma) => {
      const now = new Date()
      const plans = await prisma.revisionPlan.findMany({
        where: { tenantId, status: 'active', nextDueAt: { lt: now } },
        include: { revisionType: { select: { name: true } }, asset: { select: { name: true } } },
        take: 20,
      })
      return plans.map(p => ({
        fingerprint: `overdue_revision:${tenantId}:${p.id}`,
        description: `${p.revisionType?.name ?? p.title} — ${p.asset?.name ?? 'bez zařízení'}`,
        entityType: 'RevisionPlan',
        entityId: p.id,
        propertyId: p.propertyId ?? undefined,
        actionLabel: 'Otevřít plán činností',
        actionUrl: `/revisions`,
      }))
    },
  },
  {
    code: 'overdue_work_order',
    title: 'Pracovní úkol je po termínu',
    severity: 'warning',
    run: async (tenantId, prisma) => {
      const now = new Date()
      const wos = await prisma.workOrder.findMany({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, deadline: { lt: now } },
        select: { id: true, title: true, propertyId: true },
        take: 20,
      })
      return wos.map(w => ({
        fingerprint: `overdue_wo:${tenantId}:${w.id}`,
        description: w.title,
        entityType: 'WorkOrder',
        entityId: w.id,
        propertyId: w.propertyId ?? undefined,
        actionLabel: 'Otevřít úkol',
        actionUrl: `/workorders`,
      }))
    },
  },
  {
    code: 'urgent_ticket_no_assignee',
    title: 'Urgentní požadavek nemá přiřazeného řešitele',
    severity: 'critical',
    run: async (tenantId, prisma) => {
      const tickets = await prisma.helpdeskTicket.findMany({
        where: {
          tenantId,
          priority: { in: ['high', 'urgent'] },
          status: { in: ['open', 'in_progress'] },
          assigneeId: null,
        },
        select: { id: true, number: true, title: true, propertyId: true },
        take: 20,
      })
      return tickets.map(t => ({
        fingerprint: `no_assignee:${tenantId}:${t.id}`,
        description: `HD-${String(t.number).padStart(4, '0')} ${t.title}`,
        entityType: 'HelpdeskTicket',
        entityId: t.id,
        propertyId: t.propertyId ?? undefined,
        actionLabel: 'Přiřadit řešitele',
        actionUrl: `/helpdesk`,
      }))
    },
  },
  {
    code: 'asset_no_recurring_plan',
    title: 'Zařízení nemá nastavenou opakovanou činnost',
    severity: 'info',
    run: async (tenantId, prisma) => {
      const assets = await prisma.asset.findMany({
        where: {
          tenantId,
          deletedAt: null,
          recurringPlans: { none: {} },
        },
        select: { id: true, name: true, propertyId: true },
        take: 20,
      })
      return assets.map(a => ({
        fingerprint: `no_plan:${tenantId}:${a.id}`,
        description: a.name,
        entityType: 'Asset',
        entityId: a.id,
        propertyId: a.propertyId ?? undefined,
        actionLabel: 'Nastavit plán',
        actionUrl: `/assets/${a.id}?tab=recurring`,
      }))
    },
  },
]
