import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { getTenantId } from '../common/tenant-context'

export interface SendEmailDto {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
  from?:    string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

@Injectable()
export class EmailService {
  private readonly logger     = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null
  private readonly enabled:   boolean
  private readonly fromEmail: string
  private readonly fromName:  string

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const host = this.config.get<string>('SMTP_HOST')
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')

    this.fromEmail = this.config.get<string>('SMTP_FROM_EMAIL') ?? 'noreply@ifmio.cz'
    this.fromName  = this.config.get<string>('SMTP_FROM_NAME')  ?? 'ifmio'
    this.enabled   = !!(host && user && pass)

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.logger.log(`Email ZAPNUT — ${host}:${port}`)
    } else {
      this.logger.warn('Email VYPNUT — nastavte SMTP_HOST, SMTP_USER, SMTP_PASS')
    }
  }

  async send(dto: SendEmailDto): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.warn(`Email preskocen (SMTP neni nakonfigurovan): ${dto.subject}`)
      return false
    }

    const recipient = Array.isArray(dto.to) ? dto.to.join(', ') : dto.to

    try {
      const info = await this.transporter.sendMail({
        from:    `"${this.fromName}" <${this.fromEmail}>`,
        to:      recipient,
        subject: dto.subject,
        html:    dto.html,
        text:    dto.text ?? dto.html.replace(/<[^>]*>/g, ''),
      })

      this.logger.log(`Email odeslan: ${info.messageId} → ${recipient}`)
      this.logToOutbox(recipient, dto.subject, 'sent', info.messageId).catch(() => {})
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Email selhal: ${message}`)
      this.logToOutbox(recipient, dto.subject, 'failed', undefined, message).catch(() => {})
      return false
    }
  }

  /** Write to OutboxLog — fire-and-forget, never throws */
  private async logToOutbox(
    recipient: string,
    subject: string | undefined,
    status: 'sent' | 'failed',
    externalId?: string,
    error?: string,
  ): Promise<void> {
    try {
      const tenantId = getTenantId()
      if (!tenantId) return // system emails without tenant context — skip logging

      await this.prisma.outboxLog.create({
        data: {
          tenantId,
          channel: 'email',
          recipient,
          subject: subject ?? null,
          status,
          externalId: externalId ?? null,
          error: error ?? null,
        },
      })
    } catch (err) {
      this.logger.warn(`OutboxLog zapis selhal: ${err}`)
    }
  }

  async sendReminder(params: {
    to:          string
    firstName:   string
    lastName:    string
    tenantName:  string
    subject:     string
    body:        string
    amount:      number
    dueDate:     string
    level:       string
  }): Promise<boolean> {
    const levelLabel =
      params.level === 'first'  ? '1. upomínka' :
      params.level === 'second' ? '2. upomínka' :
      '3. upomínka (předžalobní)'

    const html = this.reminderHtml(params)

    return this.send({
      to:      params.to,
      subject: `[${levelLabel}] ${params.subject}`,
      html,
    })
  }

  async sendWelcome(params: {
    to:         string
    name:       string
    tenantName: string
    loginUrl:   string
  }): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><title>Vitejte v ${escapeHtml(params.tenantName)}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #374151;">
  <div style="background: #1e1b4b; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">ifmio</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #111827;">Vítejte, ${escapeHtml(params.name)}!</h2>
    <p>Byl vám vytvořen přístup do systému ${escapeHtml(params.tenantName)}.</p>
    <a href="${encodeURI(params.loginUrl)}"
       style="display: inline-block; background: #6366f1; color: #fff;
              padding: 12px 24px; border-radius: 6px; text-decoration: none;
              font-weight: 600; margin: 16px 0;">
      Přihlásit se
    </a>
    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
      Pokud jste tento email neočekávali, ignorujte jej.
    </p>
  </div>
</body>
</html>`

    return this.send({
      to:      params.to,
      subject: `Vitejte v ${params.tenantName}`,
      html,
    })
  }

  private reminderHtml(params: {
    firstName:  string
    lastName:   string
    tenantName: string
    body:       string
    amount:     number
    dueDate:    string
    level:      string
  }): string {
    const amountFmt = Number(params.amount).toLocaleString('cs-CZ')
    const dueFmt    = new Date(params.dueDate).toLocaleDateString('cs-CZ')

    const borderColor =
      params.level === 'third'  ? '#ef4444' :
      params.level === 'second' ? '#f59e0b' : '#6366f1'

    return `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #374151;">
  <div style="background: #1e1b4b; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">${escapeHtml(params.tenantName)}</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: 4px solid ${borderColor};
              border-radius: 0 0 8px 8px; padding: 32px;">
    <p style="white-space: pre-line; line-height: 1.7;">${escapeHtml(params.body)}</p>

    <div style="background: #fef3c7; border: 1px solid #fcd34d;
                border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
      <div style="font-size: 18px; font-weight: 700; color: #92400e;">
        Dlužná částka: ${amountFmt} Kč
      </div>
      <div style="color: #92400e; margin-top: 4px;">
        Splatnost: ${dueFmt}
      </div>
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
      Tento email byl odeslan systemem ifmio. Neodpovidejte na nej.
    </p>
  </div>
</body>
</html>`
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false
    try {
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }
}
