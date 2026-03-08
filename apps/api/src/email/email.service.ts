import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config'

export interface SendEmailDto {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
  from?:    string
}

@Injectable()
export class EmailService {
  private readonly logger     = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null
  private readonly enabled:   boolean
  private readonly fromEmail: string
  private readonly fromName:  string

  constructor(private config: ConfigService) {
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

    try {
      const info = await this.transporter.sendMail({
        from:    `"${this.fromName}" <${this.fromEmail}>`,
        to:      Array.isArray(dto.to) ? dto.to.join(', ') : dto.to,
        subject: dto.subject,
        html:    dto.html,
        text:    dto.text ?? dto.html.replace(/<[^>]*>/g, ''),
      })

      this.logger.log(`Email odeslan: ${info.messageId} → ${dto.to}`)
      return true
    } catch (err) {
      this.logger.error(`Email selhal: ${err}`)
      return false
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
      params.level === 'first'  ? '1. upominka' :
      params.level === 'second' ? '2. upominka' :
      '3. upominka (predzalobni)'

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
<head><meta charset="UTF-8"><title>Vitejte v ${params.tenantName}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #374151;">
  <div style="background: #1e1b4b; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">ifmio</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #111827;">Vitejte, ${params.name}!</h2>
    <p>Byl vam vytvoren pristup do systemu ${params.tenantName}.</p>
    <a href="${params.loginUrl}"
       style="display: inline-block; background: #6366f1; color: #fff;
              padding: 12px 24px; border-radius: 6px; text-decoration: none;
              font-weight: 600; margin: 16px 0;">
      Prihlasit se
    </a>
    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
      Pokud jste tento email neocekavali, ignorujte jej.
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
    <h1 style="color: #fff; margin: 0; font-size: 20px;">${params.tenantName}</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: 4px solid ${borderColor};
              border-radius: 0 0 8px 8px; padding: 32px;">
    <p style="white-space: pre-line; line-height: 1.7;">${params.body}</p>

    <div style="background: #fef3c7; border: 1px solid #fcd34d;
                border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
      <div style="font-size: 18px; font-weight: 700; color: #92400e;">
        Dluzna castka: ${amountFmt} Kc
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
