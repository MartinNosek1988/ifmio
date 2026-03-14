import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { ReportsService } from './reports.service'
import type { AuthUser } from '@ifmio/shared-types'

const TENANT_WIDE_ROLES = ['tenant_owner', 'tenant_admin']

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private reports: ReportsService,
  ) {}

  // ─── SUBSCRIPTION CRUD ─────────────────────────────────────

  async listSubscriptions(user: AuthUser) {
    return this.prisma.scheduledReportSubscription.findMany({
      where: { tenantId: user.tenantId, userId: user.id },
      orderBy: { createdAt: 'asc' },
    })
  }

  async upsertSubscription(user: AuthUser, dto: {
    reportType: string
    frequency?: string
    format?: string
    propertyId?: string | null
    isEnabled?: boolean
  }) {
    const existing = await this.prisma.scheduledReportSubscription.findFirst({
      where: { tenantId: user.tenantId, userId: user.id, reportType: dto.reportType as any },
    })

    if (existing) {
      return this.prisma.scheduledReportSubscription.update({
        where: { id: existing.id },
        data: {
          frequency: (dto.frequency as any) ?? existing.frequency,
          format: (dto.format as any) ?? existing.format,
          propertyId: dto.propertyId !== undefined ? (dto.propertyId || null) : existing.propertyId,
          isEnabled: dto.isEnabled ?? existing.isEnabled,
        },
      })
    }

    return this.prisma.scheduledReportSubscription.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        reportType: dto.reportType as any,
        frequency: (dto.frequency as any) ?? 'daily',
        format: (dto.format as any) ?? 'xlsx',
        propertyId: dto.propertyId || null,
        isEnabled: dto.isEnabled ?? true,
      },
    })
  }

  // ─── DAILY DIGEST ──────────────────────────────────────────

  async sendDailyDigests() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    let sent = 0
    let failed = 0

    for (const tenant of tenants) {
      try {
        const count = await this.sendDigestsForTenant(tenant.id, tenant.name)
        sent += count
      } catch (err) {
        this.logger.error(`Digest failed for tenant ${tenant.id}: ${err}`)
        failed++
      }
    }

    return { tenants: tenants.length, sent, failed }
  }

  private async sendDigestsForTenant(tenantId: string, tenantName: string): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true, notifEmail: true },
      select: { id: true, name: true, email: true, role: true },
    })

    // Check which users have daily_digest enabled (or default for all active users)
    const subs = await this.prisma.scheduledReportSubscription.findMany({
      where: { tenantId, reportType: 'daily_digest', isEnabled: true },
      select: { userId: true },
    })
    const subscribedUserIds = new Set(subs.map(s => s.userId))

    // If no one explicitly subscribed yet, send to all users with notifEmail=true
    // Once someone creates any subscription, only subscribed users get it
    const hasAnySubscriptions = subs.length > 0
    const recipients = hasAnySubscriptions
      ? users.filter(u => subscribedUserIds.has(u.id))
      : users

    let count = 0
    const now = new Date()
    const today = now.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    for (const user of recipients) {
      try {
        const fakeAuth: AuthUser = { id: user.id, tenantId, role: user.role as any, email: user.email, name: user.name }
        const digest = await this.buildDigest(fakeAuth, user.role)

        if (digest.totalItems === 0) continue // skip empty digests

        const subject = `Denní provozní přehled – ${today}`
        const html = this.buildDigestHtml(digest, user.name, tenantName, today)

        const ok = await this.email.send({ to: user.email, subject, html })
        if (ok) count++
      } catch (err) {
        this.logger.error(`Digest for user ${user.email} failed: ${err}`)
      }
    }

    // Update lastSentAt
    if (hasAnySubscriptions) {
      await this.prisma.scheduledReportSubscription.updateMany({
        where: { tenantId, reportType: 'daily_digest', isEnabled: true },
        data: { lastSentAt: now },
      })
    }

    return count
  }

  private async buildDigest(user: AuthUser, role: string) {
    const now = new Date()
    const isTenantWide = TENANT_WIDE_ROLES.includes(role)

    // Get accessible property IDs for scoped users
    let propertyIds: string[] | null = null
    if (!isTenantWide) {
      const assignments = await this.prisma.userPropertyAssignment.findMany({
        where: { userId: user.id },
        select: { propertyId: true },
      })
      propertyIds = assignments.map(a => a.propertyId)
      if (propertyIds.length === 0) return { totalItems: 0, sections: [] }
    }

    const propertyFilter = propertyIds ? { propertyId: { in: propertyIds } } : {}
    const isResolver = role === 'operations'
    const assigneeFilter = isResolver ? { assigneeUserId: user.id } : {}
    const woAssigneeFilter = isResolver ? { assigneeUserId: user.id } : {}

    // Today's planned WOs
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const [plannedWo, overdueWo, overdueTickets, highPrioTickets] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['nova', 'v_reseni'] },
          deadline: { gte: todayStart, lt: todayEnd },
          ...propertyFilter,
          ...woAssigneeFilter,
        } as any,
        include: {
          property: { select: { name: true } },
          asset: { select: { name: true } },
          assigneeUser: { select: { name: true } },
        },
        take: 20,
      }),
      this.prisma.workOrder.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['nova', 'v_reseni'] },
          deadline: { lt: now },
          ...propertyFilter,
          ...woAssigneeFilter,
        } as any,
        include: {
          property: { select: { name: true } },
          asset: { select: { name: true } },
          assigneeUser: { select: { name: true } },
        },
        take: 20,
      }),
      this.prisma.helpdeskTicket.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['open', 'in_progress'] },
          resolutionDueAt: { lt: now },
          ...propertyFilter,
          ...assigneeFilter,
        } as any,
        include: {
          property: { select: { name: true } },
          asset: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        take: 20,
      }),
      this.prisma.helpdeskTicket.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['open', 'in_progress'] },
          priority: { in: ['high', 'urgent'] },
          ...propertyFilter,
          ...assigneeFilter,
        } as any,
        include: {
          property: { select: { name: true } },
          asset: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        take: 20,
      }),
    ])

    const sections: { title: string; items: { text: string; detail: string }[] }[] = []

    if (plannedWo.length > 0) {
      sections.push({
        title: 'Na dnešek',
        items: plannedWo.map(w => ({
          text: w.title,
          detail: [w.property?.name, w.asset?.name, w.assigneeUser?.name].filter(Boolean).join(' · '),
        })),
      })
    }

    if (overdueWo.length > 0) {
      sections.push({
        title: 'Úkoly po termínu',
        items: overdueWo.map(w => ({
          text: w.title,
          detail: [w.property?.name, w.asset?.name, w.assigneeUser?.name, w.deadline ? `Termín: ${w.deadline.toLocaleDateString('cs-CZ')}` : ''].filter(Boolean).join(' · '),
        })),
      })
    }

    if (overdueTickets.length > 0) {
      sections.push({
        title: 'Požadavky po termínu',
        items: overdueTickets.map(t => ({
          text: `HD-${String(t.number).padStart(4, '0')} ${t.title}`,
          detail: [t.property?.name, t.asset?.name, t.assignee?.name].filter(Boolean).join(' · '),
        })),
      })
    }

    if (highPrioTickets.length > 0) {
      sections.push({
        title: 'Vysoká priorita',
        items: highPrioTickets.map(t => ({
          text: `HD-${String(t.number).padStart(4, '0')} ${t.title}`,
          detail: [t.priority, t.property?.name, t.assignee?.name].filter(Boolean).join(' · '),
        })),
      })
    }

    return {
      totalItems: plannedWo.length + overdueWo.length + overdueTickets.length + highPrioTickets.length,
      sections,
    }
  }

  private buildDigestHtml(
    digest: { sections: { title: string; items: { text: string; detail: string }[] }[] },
    userName: string,
    tenantName: string,
    date: string,
  ): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : '')

    const sectionsHtml = digest.sections.map(s => `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px;color:#111827;">${esc(s.title)} (${s.items.length})</div>
        ${s.items.map(i => `
          <div style="padding:6px 0;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:500;">${esc(i.text)}</div>
            ${i.detail ? `<div style="font-size:0.8rem;color:#6b7280;">${esc(i.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')

    return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;">
  <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">${esc(tenantName)}</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">Denní provozní přehled</h2>
    <p style="color:#6b7280;">${esc(date)} · ${esc(userName)}</p>
    ${sectionsHtml}
    ${frontendUrl ? `<a href="${encodeURI(frontendUrl)}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Otevřít ifmio</a>` : ''}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">Tento email byl odeslán systémem ifmio.</p>
  </div>
</body></html>`
  }

  // ─── SCHEDULED REPORT DELIVERY ─────────────────────────────

  async processScheduledReports(frequency: 'daily' | 'weekly' | 'monthly') {
    const subs = await this.prisma.scheduledReportSubscription.findMany({
      where: {
        isEnabled: true,
        frequency,
        reportType: { not: 'daily_digest' }, // digest handled separately
      },
      include: { user: { select: { id: true, name: true, email: true, role: true, tenantId: true } } },
    })

    let sent = 0
    let failed = 0
    const now = new Date()

    for (const sub of subs) {
      // Skip if already sent in this period
      if (sub.lastSentAt && !this.shouldSendAgain(sub.lastSentAt, frequency, now)) continue

      try {
        const user = sub.user
        const fakeAuth: AuthUser = { id: user.id, tenantId: user.tenantId, role: user.role as any, email: user.email, name: user.name }
        const filters = { propertyId: sub.propertyId ?? undefined }

        let attachment: { filename: string; content: Buffer | string; contentType: string } | undefined

        if (sub.reportType === 'operations') {
          if (sub.format === 'xlsx') {
            const buf = await this.reports.exportOperationalXlsx(fakeAuth, filters)
            attachment = { filename: 'provozni-report.xlsx', content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
          } else if (sub.format === 'csv') {
            const csv = await this.reports.exportOperationalCsv(fakeAuth, filters)
            attachment = { filename: 'provozni-report.csv', content: csv, contentType: 'text/csv' }
          }
        } else if (sub.reportType === 'assets') {
          if (sub.format === 'xlsx') {
            const buf = await this.reports.exportAssetXlsx(fakeAuth, filters)
            attachment = { filename: 'zarizeni-report.xlsx', content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
          } else if (sub.format === 'csv') {
            const csv = await this.reports.exportAssetCsv(fakeAuth, filters)
            attachment = { filename: 'zarizeni-report.csv', content: csv, contentType: 'text/csv' }
          }
        } else if (sub.reportType === 'protocols') {
          if (sub.format === 'xlsx') {
            const buf = await this.reports.exportProtocolXlsx(fakeAuth, filters)
            attachment = { filename: 'protokoly-report.xlsx', content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
          } else if (sub.format === 'csv') {
            const csv = await this.reports.exportProtocolCsv(fakeAuth, filters)
            attachment = { filename: 'protokoly-report.csv', content: csv, contentType: 'text/csv' }
          }
        }

        const typeLabels: Record<string, string> = { operations: 'Provozní report', assets: 'Technický report zařízení', protocols: 'Registr protokolů' }
        const subject = `${typeLabels[sub.reportType] ?? 'Report'} – ${now.toLocaleDateString('cs-CZ')}`

        const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151;">
  <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0;"><h1 style="color:#fff;margin:0;font-size:20px;">ifmio</h1></div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">${typeLabels[sub.reportType] ?? 'Report'}</h2>
    <p>V příloze najdete ${sub.format.toUpperCase()} export reportu ke dni ${now.toLocaleDateString('cs-CZ')}.</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">Tento email byl odeslán automaticky systémem ifmio.</p>
  </div>
</body></html>`

        await this.email.send({
          to: user.email,
          subject,
          html,
          ...(attachment ? { attachments: [attachment] } : {}),
        } as any)

        await this.prisma.scheduledReportSubscription.update({
          where: { id: sub.id },
          data: { lastSentAt: now },
        })

        sent++
      } catch (err) {
        this.logger.error(`Scheduled report ${sub.id} failed: ${err}`)
        failed++
      }
    }

    return { processed: subs.length, sent, failed }
  }

  private shouldSendAgain(lastSent: Date, frequency: string, now: Date): boolean {
    const diff = now.getTime() - lastSent.getTime()
    const hours = diff / 3_600_000
    if (frequency === 'daily') return hours >= 20 // at least 20h gap
    if (frequency === 'weekly') return hours >= 6 * 24 // at least 6 days
    if (frequency === 'monthly') return hours >= 27 * 24 // at least 27 days
    return true
  }
}
