import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from '../../email/email.service'
import { PrismaService } from '../../prisma/prisma.service'

export type SecurityEventType =
  | 'RISK_BLOCKED'
  | 'IMPOSSIBLE_TRAVEL'
  | 'SUSPICIOUS_REFRESH'
  | 'BRUTE_FORCE'
  | 'API_KEY_COMPROMISED'
  | 'GDPR_ERASURE'
  | 'USER_DEACTIVATED'
  | 'MFA_DISABLED'

export interface SecurityEvent {
  tenantId: string
  type: SecurityEventType
  severity: 'critical' | 'high' | 'medium'
  details: Record<string, unknown>
  timestamp: Date
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'KRITICKÝ',
  high: 'VYSOKÝ',
  medium: 'STŘEDNÍ',
}

const EVENT_LABELS: Record<SecurityEventType, string> = {
  RISK_BLOCKED: 'Přihlášení zablokováno (vysoké riziko)',
  IMPOSSIBLE_TRAVEL: 'Nemožný přesun detekován',
  SUSPICIOUS_REFRESH: 'Podezřelé obnovení tokenu',
  BRUTE_FORCE: 'Útok hrubou silou detekován',
  API_KEY_COMPROMISED: 'API klíč kompromitován',
  GDPR_ERASURE: 'GDPR výmaz osobních údajů',
  USER_DEACTIVATED: 'Uživatel deaktivován',
  MFA_DISABLED: 'Dvoufaktorové ověření vypnuto',
}

const MAX_ALERTS_PER_HOUR = 10

@Injectable()
export class SecurityAlertingService {
  private readonly logger = new Logger(SecurityAlertingService.name)
  private recentAlertCount = new Map<string, number>()
  private resetInterval: ReturnType<typeof setInterval>

  constructor(
    private email: EmailService,
    private prisma: PrismaService,
  ) {
    // Reset counters every hour
    this.resetInterval = setInterval(() => this.recentAlertCount.clear(), 3_600_000)
  }

  async alert(event: SecurityEvent): Promise<void> {
    // Rate limit: max alerts per hour per tenant
    const count = this.recentAlertCount.get(event.tenantId) ?? 0
    if (count >= MAX_ALERTS_PER_HOUR) {
      this.logger.warn(`Alert rate limit reached for tenant ${event.tenantId}`)
      return
    }
    this.recentAlertCount.set(event.tenantId, count + 1)

    // Find admin emails for this tenant
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId: event.tenantId,
        role: { in: ['tenant_owner', 'tenant_admin'] },
        isActive: true,
        notifEmail: true,
      },
      select: { email: true, name: true },
    })

    if (admins.length === 0) return

    const subject = `[ifmio] ${SEVERITY_LABELS[event.severity]} — ${EVENT_LABELS[event.type]}`
    const html = this.renderAlert(event)

    for (const admin of admins) {
      this.email.send({
        to: admin.email,
        subject,
        html,
      }).catch(err => this.logger.error(`Alert email failed for ${admin.email}: ${err}`))
    }

    this.logger.log(`Security alert sent: ${event.type} (${event.severity}) for tenant ${event.tenantId}`)
  }

  private renderAlert(event: SecurityEvent): string {
    const color = SEVERITY_COLORS[event.severity] ?? '#ca8a04'
    const label = SEVERITY_LABELS[event.severity] ?? event.severity
    const title = EVENT_LABELS[event.type] ?? event.type

    const detailRows = Object.entries(event.details)
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px">${this.escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px">${this.escapeHtml(String(v))}</td></tr>`)
      .join('')

    return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151">
  <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:20px">ifmio — Bezpečnostní upozornění</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:4px solid ${color};padding:24px;border-radius:0 0 8px 8px">
    <div style="display:inline-block;background:${color};color:#fff;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;margin-bottom:12px">${label}</div>
    <h2 style="color:#111827;margin:8px 0 16px">${this.escapeHtml(title)}</h2>
    <table style="border-collapse:collapse;width:100%">${detailRows}</table>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px">
      Čas: ${event.timestamp.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}<br>
      <a href="https://ifmio.com/admin/security" style="color:#6366f1">Otevřít Security Dashboard →</a>
    </p>
    <p style="color:#9ca3af;font-size:11px">Tento email byl odeslán automaticky systémem ifmio. Neodpovídejte na něj.</p>
  </div>
</body>
</html>`
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
