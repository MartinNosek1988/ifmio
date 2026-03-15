import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MioConfigService, type MioConfig } from './mio-config.service'
import { MioWebhookService, type MioEvent } from './mio-webhook.service'
import { randomUUID } from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'

// Severity → Helpdesk priority mapping
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  warning: 'high',
  info: 'medium',
}

// ─── Centralized recommendation thresholds (defaults) ─────────
const THRESHOLDS = {
  RECURRING_ADOPTION_MIN_ASSETS: 3,
  RECURRING_ADOPTION_MAX_PLANS: 2,
  REPORTING_TIP_MIN_TICKETS: 10,
  HELPDESK_FILTER_TIP_MIN_TICKETS: 20,
  PROTOCOL_TIP_MIN_COMPLETED_WO: 5,
  SECURITY_TIP_MIN_USERS: 3,
}

// Default auto-ticket codes (overridable by MioConfig)
const DEFAULT_AUTO_TICKET_CODES = new Set([
  'overdue_revision',
  'urgent_ticket_no_assignee',
])

interface FindingRule {
  code: string
  title: string
  severity: string
  run: (tenantId: string, prisma: PrismaService, thresholds: Record<string, number>) => Promise<DetectedIssue[]>
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

  constructor(
    private prisma: PrismaService,
    private mioConfig: MioConfigService,
    @Inject(forwardRef(() => MioWebhookService)) private webhooks: MioWebhookService,
  ) {}

  private emitWebhook(tenantId: string, eventType: string, finding: any) {
    const event: MioEvent = {
      eventId: randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      tenantId,
      kind: finding.kind ?? 'finding',
      code: finding.code,
      severity: finding.severity,
      status: finding.status,
      title: finding.title,
      description: finding.description,
      entityType: finding.entityType,
      entityId: finding.entityId,
      propertyId: finding.propertyId,
      actionUrl: finding.actionUrl,
    }
    this.webhooks.emitEvent(tenantId, event).catch(() => {})
  }

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

    const config = await this.mioConfig.getConfig(tenantId)
    const detectedFingerprints = new Set<string>()

    // Build effective thresholds (config overrides defaults)
    const effectiveThresholds = { ...THRESHOLDS, ...config.thresholds }

    for (const rule of RULES) {
      // Skip disabled finding families
      if (config.enabledFindings[rule.code] === false) continue

      try {
        const issues = await rule.run(tenantId, this.prisma, effectiveThresholds)

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
            this.emitWebhook(tenantId, 'mio.finding.created', finding)

            // Auto-ticket: respect tenant config override, fall back to default policy
            const autoTicket = config.autoTicketPolicy[rule.code] ?? DEFAULT_AUTO_TICKET_CODES.has(rule.code)
            if (autoTicket && rule.severity !== 'info') {
              const ticket = await this.createTicketForFinding(tenantId, finding)
              if (ticket) ticketsCreated++
            }
          }
        }
      } catch (err) {
        this.logger.error(`Rule ${rule.code} failed for tenant ${tenantId}: ${err}`)
      }
    }

    // Run recommendation rules
    for (const rule of RECOMMENDATION_RULES) {
      // Skip disabled recommendation families
      if (config.enabledRecommendations[rule.code] === false) continue

      try {
        const issues = await rule.run(tenantId, this.prisma, effectiveThresholds)
        for (const issue of issues) {
          detectedFingerprints.add(issue.fingerprint)
          const existing = await this.prisma.mioFinding.findUnique({ where: { fingerprint: issue.fingerprint } })
          if (existing) {
            const update: Record<string, unknown> = { lastDetectedAt: now }
            if (existing.status === 'resolved') { update.status = 'active'; update.resolvedAt = null }
            await this.prisma.mioFinding.update({ where: { id: existing.id }, data: update })
          } else {
            const rec = await this.prisma.mioFinding.create({
              data: {
                tenantId, kind: 'recommendation', code: rule.code, title: rule.title,
                description: issue.description, category: rule.category, severity: 'info', confidence: 'medium',
                fingerprint: issue.fingerprint, actionLabel: issue.actionLabel ?? null, actionUrl: issue.actionUrl ?? null,
                firstDetectedAt: now, lastDetectedAt: now,
              },
            })
            created++
            this.emitWebhook(tenantId, 'mio.recommendation.created', rec)
          }
        }
      } catch (err) {
        this.logger.error(`Recommendation ${rule.code} failed: ${err}`)
      }
    }

    // Resolve findings/recommendations no longer detected (skip dismissed)
    const activeItems = await this.prisma.mioFinding.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, fingerprint: true, kind: true, code: true, severity: true, title: true, description: true, entityType: true, entityId: true, propertyId: true, actionUrl: true, status: true },
    })
    for (const f of activeItems) {
      if (!detectedFingerprints.has(f.fingerprint)) {
        await this.prisma.mioFinding.update({
          where: { id: f.id },
          data: { status: 'resolved', resolvedAt: now },
        })
        resolved++
        this.emitWebhook(tenantId, 'mio.finding.resolved', { ...f, status: 'resolved' })
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
    this.emitWebhook(tenantId, 'mio.insight.ticket_created', {
      ...finding, status: 'active', metadata: { ticketId: ticket.id, ticketNumber: number },
    })
    return true
  }

  async runDetectionForUser(user: { tenantId: string }) {
    return this.runDetectionForTenant(user.tenantId)
  }

  // ─── API METHODS ────────────────────────────────────────────

  async listInsights(user: AuthUser, query?: {
    kind?: string; status?: string; severity?: string; category?: string; search?: string; hasTicket?: string
  }) {
    const where: any = { tenantId: user.tenantId }
    if (query?.kind) where.kind = query.kind
    if (query?.status) where.status = query.status
    else where.status = { not: 'resolved' } // default: hide resolved
    if (query?.severity) where.severity = query.severity
    if (query?.category) where.category = query.category
    if (query?.hasTicket === 'true') where.helpdeskTicketId = { not: null }
    if (query?.hasTicket === 'false') where.helpdeskTicketId = null
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    return this.prisma.mioFinding.findMany({
      where,
      orderBy: [
        { kind: 'asc' }, // findings first
        { severity: 'desc' },
        { lastDetectedAt: 'desc' },
      ],
      take: 100,
    })
  }

  async getInsightsSummary(user: AuthUser) {
    const tenantId = user.tenantId
    const [activeFindings, criticalFindings, activeRecs, snoozed, resolvedLast30] = await Promise.all([
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'finding', status: 'active' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'finding', status: 'active', severity: 'critical' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active' } }),
      this.prisma.mioFinding.count({ where: { tenantId, status: 'snoozed' } }),
      this.prisma.mioFinding.count({
        where: { tenantId, status: 'resolved', resolvedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
    ])
    return { activeFindings, criticalFindings, activeRecs, snoozed, resolvedLast30 }
  }

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
    const updated = await this.prisma.mioFinding.update({
      where: { id },
      data: { status: 'dismissed', dismissedAt: new Date() },
    })
    const eventType = finding.kind === 'recommendation' ? 'mio.recommendation.dismissed' : 'mio.finding.dismissed'
    this.emitWebhook(user.tenantId, eventType, updated)
    return updated
  }

  async snooze(user: AuthUser, id: string, until: Date) {
    const finding = await this.prisma.mioFinding.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!finding) return null
    const updated = await this.prisma.mioFinding.update({
      where: { id },
      data: { status: 'snoozed', snoozedUntil: until },
    })
    const eventType = finding.kind === 'recommendation' ? 'mio.recommendation.snoozed' : 'mio.finding.snoozed'
    this.emitWebhook(user.tenantId, eventType, updated)
    return updated
  }

  async restore(user: AuthUser, id: string) {
    const finding = await this.prisma.mioFinding.findFirst({
      where: { id, tenantId: user.tenantId, status: { in: ['dismissed', 'snoozed'] } },
    })
    if (!finding) return null
    const updated = await this.prisma.mioFinding.update({
      where: { id },
      data: { status: 'active', dismissedAt: null, snoozedUntil: null },
    })
    this.emitWebhook(user.tenantId, 'mio.finding.restored', updated)
    return updated
  }

  // ─── RECOMMENDATION API ──────────────────────────────────────

  async listRecommendations(user: AuthUser) {
    return this.prisma.mioFinding.findMany({
      where: { tenantId: user.tenantId, kind: 'recommendation', status: 'active' },
      orderBy: { lastDetectedAt: 'desc' },
      take: 20,
    })
  }

  async getRecommendationSummary(user: AuthUser) {
    const tenantId = user.tenantId
    const [total, efficiency, security, adoption] = await Promise.all([
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active', category: 'efficiency' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active', category: 'security' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active', category: 'adoption' } }),
    ])
    return { total, efficiency, security, adoption }
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
    run: async (tenantId, prisma, _thresholds) => {
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
    run: async (tenantId, prisma, _thresholds) => {
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
    run: async (tenantId, prisma, _thresholds) => {
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
    run: async (tenantId, prisma, _thresholds) => {
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
    run: async (tenantId, prisma, _thresholds) => {
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

// ─── RECOMMENDATION RULES ─────────────────────────────────────

interface RecommendationRule {
  code: string
  title: string
  category: string
  run: (tenantId: string, prisma: PrismaService, thresholds: Record<string, number>) => Promise<DetectedIssue[]>
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    code: 'recurring_plans_adoption',
    title: 'Opakované činnosti můžete automatizovat',
    category: 'efficiency',
    run: async (tenantId, prisma, thresholds) => {
      const [assetCount, planCount] = await Promise.all([
        prisma.asset.count({ where: { tenantId, deletedAt: null } }),
        prisma.recurringActivityPlan.count({ where: { tenantId, isActive: true } }),
      ])
      if (assetCount > thresholds.RECURRING_ADOPTION_MIN_ASSETS && planCount < thresholds.RECURRING_ADOPTION_MAX_PLANS) {
        return [{
          fingerprint: `rec:recurring_adoption:${tenantId}`,
          description: `Máte ${assetCount} zařízení, ale jen ${planCount} opakovaných plánů. Nastavte opakované činnosti pro pravidelnou údržbu.`,
          actionLabel: 'Otevřít zařízení',
          actionUrl: '/assets',
        }]
      }
      return []
    },
  },
  {
    code: 'reporting_export_tip',
    title: 'Přehledy můžete exportovat do CSV/XLSX',
    category: 'efficiency',
    run: async (tenantId, prisma, thresholds) => {
      // Show when tenant has >10 tickets but probably hasn't used exports
      const ticketCount = await prisma.helpdeskTicket.count({ where: { tenantId } })
      if (ticketCount > thresholds.REPORTING_TIP_MIN_TICKETS) {
        return [{
          fingerprint: `rec:reporting_export:${tenantId}`,
          description: 'Provozní přehledy, zařízení a protokoly můžete exportovat pro další zpracování.',
          actionLabel: 'Otevřít reporting',
          actionUrl: '/reporting/operations',
        }]
      }
      return []
    },
  },
  {
    code: 'helpdesk_filtering_tip',
    title: 'Helpdesk můžete filtrovat podle zdroje a priority',
    category: 'adoption',
    run: async (tenantId, prisma, thresholds) => {
      const ticketCount = await prisma.helpdeskTicket.count({ where: { tenantId } })
      if (ticketCount > thresholds.HELPDESK_FILTER_TIP_MIN_TICKETS) {
        return [{
          fingerprint: `rec:helpdesk_filter:${tenantId}`,
          description: 'Při větším počtu požadavků využijte filtry podle zdroje (manuální / opakované), priority a stavu.',
          actionLabel: 'Otevřít helpdesk',
          actionUrl: '/helpdesk',
        }]
      }
      return []
    },
  },
  {
    code: 'attachments_protocol_tip',
    title: 'K úkolům můžete přidávat přílohy a protokoly',
    category: 'adoption',
    run: async (tenantId, prisma, thresholds) => {
      // Show when tenant has completed WOs but no protocols linked
      const completedWo = await prisma.workOrder.count({
        where: { tenantId, status: { in: ['vyresena', 'uzavrena'] } },
      })
      const protocolCount = await prisma.protocol.count({
        where: { tenantId, sourceType: 'work_order' },
      })
      if (completedWo > thresholds.PROTOCOL_TIP_MIN_COMPLETED_WO && protocolCount === 0) {
        return [{
          fingerprint: `rec:protocol_adoption:${tenantId}`,
          description: 'K pracovním úkolům můžete přidávat přílohy a protokoly pro lepší dohledatelnost a audit.',
          actionLabel: 'Otevřít úkoly',
          actionUrl: '/workorders',
        }]
      }
      return []
    },
  },
  {
    code: 'security_access_tip',
    title: 'Zkontrolujte bezpečnostní nastavení přístupů',
    category: 'security',
    run: async (tenantId, prisma, thresholds) => {
      // Show when tenant has >3 active users (worth reviewing access)
      const userCount = await prisma.user.count({ where: { tenantId, isActive: true } })
      if (userCount > thresholds.SECURITY_TIP_MIN_USERS) {
        return [{
          fingerprint: `rec:security_access:${tenantId}`,
          description: 'S větším počtem uživatelů doporučujeme zkontrolovat role, přístupy k objektům a bezpečnostní nastavení.',
          actionLabel: 'Otevřít tým',
          actionUrl: '/team',
        }]
      }
      return []
    },
  },
]
