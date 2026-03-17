import { Injectable, Logger } from '@nestjs/common'
import { GraphAuthService } from './graph-auth.service'

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name)

  constructor(private graphAuth: GraphAuthService) {}

  async sendWebhookMessage(webhookUrl: string, message: string, title?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const card = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              ...(title ? [{ type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium' }] : []),
              { type: 'TextBlock', text: message, wrap: true },
            ],
          },
        }],
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      })

      if (!res.ok) return { success: false, error: `Webhook: ${res.status}` }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async sendChannelMessage(teamId: string, channelId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.graphAuth.isConfigured()) return { success: false, error: 'M365 není nakonfigurován' }
    try {
      const result = await this.graphAuth.graphRequest('POST', `/teams/${teamId}/channels/${channelId}/messages`, {
        body: { contentType: 'html', content: message },
      })
      return { success: true, messageId: result?.id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  buildTicketCard(ticket: { number: number; title: string; category: string; propertyName: string; unitName?: string }) {
    return {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard', version: '1.4',
      body: [
        { type: 'TextBlock', text: `🎫 Nový ticket #${ticket.number}`, weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: ticket.title, wrap: true },
        { type: 'FactSet', facts: [
          { title: 'Nemovitost', value: ticket.propertyName },
          ...(ticket.unitName ? [{ title: 'Jednotka', value: ticket.unitName }] : []),
          { title: 'Kategorie', value: ticket.category },
        ] },
      ],
      actions: [{ type: 'Action.OpenUrl', title: 'Otevřít v ifmio', url: `${process.env.APP_URL || 'https://ifmio.com'}/helpdesk` }],
    }
  }

  buildPaymentAlertCard(alert: { propertyName: string; count: number; totalAmount: number }) {
    return {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard', version: '1.4',
      body: [
        { type: 'TextBlock', text: '💰 Upozornění na nedoplatky', weight: 'Bolder', size: 'Medium', color: 'Attention' },
        { type: 'FactSet', facts: [
          { title: 'Nemovitost', value: alert.propertyName },
          { title: 'Počet', value: String(alert.count) },
          { title: 'Celkem', value: `${alert.totalAmount.toLocaleString('cs-CZ')} Kč` },
        ] },
      ],
    }
  }
}
