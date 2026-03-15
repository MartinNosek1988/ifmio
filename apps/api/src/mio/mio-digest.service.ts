import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { MioConfigService, type MioConfig } from './mio-config.service'
import type { AuthUser } from '@ifmio/shared-types'

const TENANT_WIDE_ROLES = ['tenant_owner', 'tenant_admin']
const SEVERITY_ORDER: Record<string, number> = { critical: 3, warning: 2, info: 1 }
const SEV_LABEL: Record<string, string> = { critical: 'Kritické', warning: 'Varování', info: 'Informace' }
const VALID_FREQUENCIES = ['daily', 'weekly']
const VALID_SEVERITIES = ['critical', 'warning', 'info']

export interface MioDigestMeta {
  includeFindings?: boolean
  includeRecommendations?: boolean
  minSeverity?: string
}

@Injectable()
export class MioDigestService {
  private readonly logger = new Logger(MioDigestService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private mioConfig: MioConfigService,
  ) {}

  // ─── USER PREFERENCES API ────────────────────────────────────

  async getUserPreferences(user: AuthUser) {
    const config = await this.mioConfig.getConfig(user.tenantId)
    const sub = await this.prisma.scheduledReportSubscription.findFirst({
      where: { tenantId: user.tenantId, userId: user.id, reportType: 'mio_digest' },
    })

    const tenantDefaults = {
      enabled: config.digest.enabled,
      frequency: config.digest.defaultFrequency,
      includeFindings: config.digest.includeFindings,
      includeRecommendations: config.digest.includeRecommendations,
      minSeverity: config.digest.minSeverity,
    }

    if (!sub) {
      return {
        source: 'tenant_default' as const,
        effective: tenantDefaults,
        override: null,
        tenantDefaults,
      }
    }

    const meta = (sub.metadata ?? {}) as MioDigestMeta
    const override = {
      enabled: sub.isEnabled,
      frequency: sub.frequency,
      includeFindings: meta.includeFindings ?? tenantDefaults.includeFindings,
      includeRecommendations: meta.includeRecommendations ?? tenantDefaults.includeRecommendations,
      minSeverity: meta.minSeverity ?? tenantDefaults.minSeverity,
    }

    return {
      source: 'user_override' as const,
      effective: override,
      override,
      tenantDefaults,
    }
  }

  async updateUserPreferences(user: AuthUser, dto: {
    enabled?: boolean
    frequency?: string
    includeFindings?: boolean
    includeRecommendations?: boolean
    minSeverity?: string
  }) {
    // Validate
    if (dto.frequency && !VALID_FREQUENCIES.includes(dto.frequency)) {
      throw new BadRequestException(`Neplatná frekvence: ${dto.frequency}`)
    }
    if (dto.minSeverity && !VALID_SEVERITIES.includes(dto.minSeverity)) {
      throw new BadRequestException(`Neplatná závažnost: ${dto.minSeverity}`)
    }

    const existing = await this.prisma.scheduledReportSubscription.findFirst({
      where: { tenantId: user.tenantId, userId: user.id, reportType: 'mio_digest' },
    })

    const meta: MioDigestMeta = {
      includeFindings: dto.includeFindings,
      includeRecommendations: dto.includeRecommendations,
      minSeverity: dto.minSeverity,
    }

    if (existing) {
      const existingMeta = (existing.metadata ?? {}) as MioDigestMeta
      const mergedMeta: MioDigestMeta = {
        includeFindings: dto.includeFindings ?? existingMeta.includeFindings,
        includeRecommendations: dto.includeRecommendations ?? existingMeta.includeRecommendations,
        minSeverity: dto.minSeverity ?? existingMeta.minSeverity,
      }
      await this.prisma.scheduledReportSubscription.update({
        where: { id: existing.id },
        data: {
          isEnabled: dto.enabled ?? existing.isEnabled,
          frequency: (dto.frequency as any) ?? existing.frequency,
          metadata: mergedMeta as any,
        },
      })
    } else {
      await this.prisma.scheduledReportSubscription.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          reportType: 'mio_digest' as any,
          frequency: (dto.frequency as any) ?? 'daily',
          format: 'email_only' as any,
          isEnabled: dto.enabled ?? true,
          metadata: meta as any,
        },
      })
    }

    return this.getUserPreferences(user)
  }

  async deleteUserPreferences(user: AuthUser) {
    await this.prisma.scheduledReportSubscription.deleteMany({
      where: { tenantId: user.tenantId, userId: user.id, reportType: 'mio_digest' },
    })
    return this.getUserPreferences(user)
  }

  // ─── MAIN ENTRY — called by CronService ──────────────────────

  async sendMioDigests(frequency: 'daily' | 'weekly') {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const tenant of tenants) {
      try {
        const result = await this.sendDigestsForTenant(tenant.id, tenant.name, frequency)
        sent += result.sent
        skipped += result.skipped
      } catch (err) {
        this.logger.error(`Mio digest failed for tenant ${tenant.id}: ${err}`)
        failed++
      }
    }

    this.logger.log(`Mio ${frequency} digest: ${tenants.length} tenants, ${sent} sent, ${skipped} skipped, ${failed} failed`)
    return { tenants: tenants.length, sent, skipped, failed }
  }

  private async sendDigestsForTenant(tenantId: string, tenantName: string, frequency: 'daily' | 'weekly') {
    // Check tenant governance
    const config = await this.mioConfig.getConfig(tenantId)
    if (!config.digest.enabled) return { sent: 0, skipped: 0 }

    // Check tenant default frequency matches
    if (config.digest.defaultFrequency === 'off') return { sent: 0, skipped: 0 }

    // Find eligible users: those with mio_digest subscription OR default eligible users
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true, notifEmail: true },
      select: { id: true, name: true, email: true, role: true },
    })

    // Check for explicit mio_digest subscriptions
    const subs = await this.prisma.scheduledReportSubscription.findMany({
      where: { tenantId, reportType: 'mio_digest', isEnabled: true },
      select: { userId: true, frequency: true, lastSentAt: true, id: true, metadata: true },
    })
    const subsByUser = new Map(subs.map(s => [s.userId, s]))

    const hasAnySubscriptions = subs.length > 0
    const now = new Date()

    let sent = 0
    let skipped = 0

    for (const user of users) {
      const sub = subsByUser.get(user.id)

      // Determine effective frequency for this user
      let effectiveFrequency: string
      if (sub) {
        effectiveFrequency = sub.frequency
      } else if (hasAnySubscriptions) {
        // Other users subscribed explicitly — skip users who didn't
        skipped++
        continue
      } else {
        // No one subscribed — use tenant default for admin/FM roles
        if (!TENANT_WIDE_ROLES.includes(user.role)) {
          skipped++
          continue
        }
        effectiveFrequency = config.digest.defaultFrequency
      }

      // Frequency filter
      if (effectiveFrequency !== frequency) {
        skipped++
        continue
      }

      // Dedup: check cooldown
      if (sub?.lastSentAt) {
        const hoursSince = (now.getTime() - sub.lastSentAt.getTime()) / 3_600_000
        if (frequency === 'daily' && hoursSince < 20) { skipped++; continue }
        if (frequency === 'weekly' && hoursSince < 6 * 24) { skipped++; continue }
      }

      try {
        const fakeAuth: AuthUser = {
          id: user.id, tenantId, role: user.role as any,
          email: user.email, name: user.name,
        }

        // Per-user metadata overrides tenant config
        const userMeta = sub ? (sub.metadata as MioDigestMeta | null) ?? {} : {}
        const effectiveConfig: MioConfig = {
          ...config,
          digest: {
            ...config.digest,
            includeFindings: userMeta.includeFindings ?? config.digest.includeFindings,
            includeRecommendations: userMeta.includeRecommendations ?? config.digest.includeRecommendations,
            minSeverity: (userMeta.minSeverity as any) ?? config.digest.minSeverity,
          },
        }

        const digest = await this.buildMioDigest(fakeAuth, effectiveConfig)
        if (digest.totalItems === 0) {
          skipped++
          await this.logDelivery(tenantId, user.id, frequency, 'skipped', 0, 0, 'Nebyly nalezeny žádné relevantní položky')
          continue
        }

        const subject = this.buildSubject(digest, frequency)
        const html = this.buildHtml(digest, user.name, tenantName, frequency)

        const ok = await this.email.send({ to: user.email, subject, html })
        if (ok) {
          sent++
          await this.logDelivery(tenantId, user.id, frequency, 'sent', digest.findings.length, digest.recommendations.length)
          // Update or create lastSentAt tracking
          if (sub) {
            await this.prisma.scheduledReportSubscription.update({
              where: { id: sub.id },
              data: { lastSentAt: now },
            })
          } else {
            await this.prisma.scheduledReportSubscription.create({
              data: {
                tenantId, userId: user.id,
                reportType: 'mio_digest' as any,
                frequency: frequency as any,
                format: 'email_only' as any,
                isEnabled: true,
                lastSentAt: now,
              },
            })
          }
        } else {
          await this.logDelivery(tenantId, user.id, frequency, 'failed', 0, 0, 'Odeslání se nepodařilo')
        }
      } catch (err) {
        this.logger.error(`Mio digest for ${user.email} failed: ${err}`)
        try {
          await this.logDelivery(tenantId, user.id, frequency, 'failed', 0, 0, 'Odeslání se nepodařilo')
        } catch { /* ignore log failure */ }
      }
    }

    return { sent, skipped }
  }

  // ─── STATUS / HISTORY / PREVIEW ────────────────────────────────

  async getDigestStatus(user: AuthUser) {
    const prefs = await this.getUserPreferences(user)
    const effective = prefs.effective

    // Last sent from subscription
    const sub = await this.prisma.scheduledReportSubscription.findFirst({
      where: { tenantId: user.tenantId, userId: user.id, reportType: 'mio_digest' },
      select: { lastSentAt: true },
    })

    // Last log entry
    const lastLog = await this.prisma.mioDigestLog.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, findingsCount: true, recommendationsCount: true, createdAt: true, skippedReason: true },
    })

    const lastSentAt = sub?.lastSentAt ?? null
    const nextPlannedSend = this.computeNextSend(effective)

    return {
      ...prefs,
      lastSentAt,
      lastResult: lastLog ? {
        status: lastLog.status,
        findingsCount: lastLog.findingsCount,
        recommendationsCount: lastLog.recommendationsCount,
        at: lastLog.createdAt,
        skippedReason: lastLog.skippedReason,
      } : null,
      nextPlannedSend,
    }
  }

  async getDigestHistory(user: AuthUser, limit = 10) {
    return this.prisma.mioDigestLog.findMany({
      where: { userId: user.id, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, frequency: true, status: true,
        findingsCount: true, recommendationsCount: true,
        skippedReason: true, createdAt: true,
      },
    })
  }

  async getDigestPreview(user: AuthUser) {
    const config = await this.mioConfig.getConfig(user.tenantId)
    const prefs = await this.getUserPreferences(user)

    const effectiveConfig: MioConfig = {
      ...config,
      digest: {
        ...config.digest,
        includeFindings: prefs.effective.includeFindings,
        includeRecommendations: prefs.effective.includeRecommendations,
        minSeverity: prefs.effective.minSeverity as any,
      },
    }

    const digest = await this.buildMioDigest(user, effectiveConfig)
    return {
      totalItems: digest.totalItems,
      criticalCount: digest.criticalCount,
      warningCount: digest.warningCount,
      infoCount: digest.infoCount,
      findings: digest.findings,
      recommendations: digest.recommendations,
    }
  }

  private computeNextSend(effective: { enabled: boolean; frequency: string }): string | null {
    if (!effective.enabled) return null
    if (effective.frequency === 'off') return null

    const now = new Date()
    const hour = now.getHours()

    if (effective.frequency === 'daily') {
      if (hour < 7) return 'Dnes v ~7:00'
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return `Zítra v ~7:00`
    }

    if (effective.frequency === 'weekly') {
      const day = now.getDay() // 0=Sun, 1=Mon
      if (day === 1 && hour < 7) return 'Dnes v ~7:00'
      const daysUntilMonday = day === 0 ? 1 : 8 - day
      const next = new Date(now)
      next.setDate(next.getDate() + daysUntilMonday)
      return `V pondělí ${next.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} v ~7:00`
    }

    return null
  }

  private async logDelivery(
    tenantId: string, userId: string, frequency: string,
    status: string, findingsCount: number, recommendationsCount: number,
    skippedReason?: string,
  ) {
    try {
      await this.prisma.mioDigestLog.create({
        data: { tenantId, userId, frequency, status, findingsCount, recommendationsCount, skippedReason },
      })
    } catch (err) {
      this.logger.error(`Failed to log digest delivery: ${err}`)
    }
  }

  // ─── DIGEST CONTENT BUILDER ──────────────────────────────────

  private async buildMioDigest(user: AuthUser, config: MioConfig) {
    const minSevOrder = SEVERITY_ORDER[config.digest.minSeverity] ?? 1

    // Scope: property-level access
    const isTenantWide = TENANT_WIDE_ROLES.includes(user.role)
    let propertyFilter: any = {}
    if (!isTenantWide) {
      const assignments = await this.prisma.userPropertyAssignment.findMany({
        where: { userId: user.id },
        select: { propertyId: true },
      })
      const ids = assignments.map(a => a.propertyId)
      if (ids.length === 0) return { totalItems: 0, criticalCount: 0, warningCount: 0, infoCount: 0, findings: [], recommendations: [] }
      propertyFilter = { propertyId: { in: ids } }
    }

    const findings: { title: string; description: string | null; severity: string; code: string }[] = []
    const recommendations: { title: string; description: string | null; category: string | null }[] = []

    // Findings (respect governance: only enabled families, min severity, active status)
    if (config.digest.includeFindings) {
      const enabledCodes = Object.entries(config.enabledFindings)
        .filter(([, v]) => v !== false)
        .map(([k]) => k)

      const items = await this.prisma.mioFinding.findMany({
        where: {
          tenantId: user.tenantId,
          kind: 'finding',
          status: 'active',
          code: { in: enabledCodes },
          ...propertyFilter,
        },
        orderBy: [{ severity: 'desc' }, { lastDetectedAt: 'desc' }],
        take: 20,
        select: { title: true, description: true, severity: true, code: true },
      })

      for (const item of items) {
        const sevOrder = SEVERITY_ORDER[item.severity] ?? 1
        if (sevOrder >= minSevOrder) {
          findings.push(item)
        }
      }
    }

    // Recommendations (respect governance)
    if (config.digest.includeRecommendations) {
      const enabledCodes = Object.entries(config.enabledRecommendations)
        .filter(([, v]) => v !== false)
        .map(([k]) => k)

      const items = await this.prisma.mioFinding.findMany({
        where: {
          tenantId: user.tenantId,
          kind: 'recommendation',
          status: 'active',
          code: { in: enabledCodes },
          ...propertyFilter,
        },
        orderBy: { lastDetectedAt: 'desc' },
        take: 5,
        select: { title: true, description: true, category: true },
      })

      recommendations.push(...items)
    }

    const criticalCount = findings.filter(f => f.severity === 'critical').length
    const warningCount = findings.filter(f => f.severity === 'warning').length
    const infoCount = findings.filter(f => f.severity === 'info').length

    return {
      totalItems: findings.length + recommendations.length,
      criticalCount,
      warningCount,
      infoCount,
      findings: findings.slice(0, 10), // cap email examples
      recommendations: recommendations.slice(0, 5),
    }
  }

  // ─── EMAIL RENDERING ─────────────────────────────────────────

  private buildSubject(digest: ReturnType<typeof this.buildMioDigest> extends Promise<infer T> ? T : never, frequency: string) {
    const freqLabel = frequency === 'weekly' ? 'Týdenní' : 'Denní'
    const parts: string[] = []
    if (digest.criticalCount > 0) parts.push(`${digest.criticalCount} kritických`)
    if (digest.warningCount > 0) parts.push(`${digest.warningCount} varování`)
    if (digest.recommendations.length > 0) parts.push(`${digest.recommendations.length} doporučení`)

    if (parts.length > 0) {
      return `${freqLabel} Mio přehled: ${parts.join(', ')}`
    }
    return `${freqLabel} přehled Mio`
  }

  private buildHtml(
    digest: { findings: { title: string; description: string | null; severity: string }[]; recommendations: { title: string; description: string | null }[]; criticalCount: number; warningCount: number; infoCount: number },
    userName: string,
    tenantName: string,
    frequency: string,
  ): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : '')
    const freqLabel = frequency === 'weekly' ? 'Týdenní' : 'Denní'
    const date = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // Severity badge colors
    const sevColor: Record<string, string> = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' }

    // Findings section
    let findingsHtml = ''
    if (digest.findings.length > 0) {
      const rows = digest.findings.map(f => {
        const color = sevColor[f.severity] ?? '#6b7280'
        return `<div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${color};">${esc(SEV_LABEL[f.severity] ?? f.severity)}</span>
            <span style="font-weight:500;">${esc(f.title)}</span>
          </div>
          ${f.description ? `<div style="font-size:0.8rem;color:#6b7280;margin-top:2px;">${esc(f.description).slice(0, 120)}</div>` : ''}
        </div>`
      }).join('')

      const countSummary: string[] = []
      if (digest.criticalCount > 0) countSummary.push(`${digest.criticalCount} kritických`)
      if (digest.warningCount > 0) countSummary.push(`${digest.warningCount} varování`)
      if (digest.infoCount > 0) countSummary.push(`${digest.infoCount} informačních`)

      findingsHtml = `
        <div style="margin-bottom:20px;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#111827;">Co je potřeba řešit</div>
          <div style="font-size:0.8rem;color:#6b7280;margin-bottom:8px;">${countSummary.join(' · ')}</div>
          ${rows}
        </div>`
    }

    // Recommendations section
    let recsHtml = ''
    if (digest.recommendations.length > 0) {
      const rows = digest.recommendations.map(r => `
        <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <div style="font-weight:500;">${esc(r.title)}</div>
          ${r.description ? `<div style="font-size:0.8rem;color:#6b7280;margin-top:2px;">${esc(r.description).slice(0, 120)}</div>` : ''}
        </div>
      `).join('')

      recsHtml = `
        <div style="margin-bottom:20px;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:8px;color:#111827;">Doporučení (${digest.recommendations.length})</div>
          ${rows}
        </div>`
    }

    // Quick links
    const links = frontendUrl ? `
      <div style="margin:20px 0;display:flex;gap:8px;flex-wrap:wrap;">
        <a href="${encodeURI(frontendUrl)}/mio/insights" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.85rem;">Otevřít Mio Insights</a>
        <a href="${encodeURI(frontendUrl)}/helpdesk" style="display:inline-block;background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.85rem;">Helpdesk</a>
        <a href="${encodeURI(frontendUrl)}/reporting/operations" style="display:inline-block;background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.85rem;">Reporting</a>
      </div>` : ''

    return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;">
  <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">${esc(tenantName)}</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">${freqLabel} přehled Mio</h2>
    <p style="color:#6b7280;">${esc(date)} · ${esc(userName)}</p>
    ${findingsHtml}
    ${recsHtml}
    ${links}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">
      Tento přehled byl odeslán systémem ifmio na základě nastavení Mio.
      Frekvenci a obsah můžete upravit v Nastavení → Mio Governance.
    </p>
  </div>
</body></html>`
  }
}
