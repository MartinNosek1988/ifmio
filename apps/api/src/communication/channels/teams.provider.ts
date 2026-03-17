import { Injectable, Logger } from '@nestjs/common'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channel.interface'

@Injectable()
export class TeamsChannelProvider implements ChannelProvider {
  readonly channelName = 'teams'
  private readonly logger = new Logger(TeamsChannelProvider.name)

  async send(message: ChannelMessage): Promise<ChannelResult> {
    const webhookUrl = process.env.M365_TEAMS_WEBHOOK_URL
    if (!webhookUrl) return { success: false, error: 'Teams webhook URL není nastavena' }

    try {
      const card = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard', version: '1.4',
            body: [
              ...(message.subject ? [{ type: 'TextBlock', text: message.subject, weight: 'Bolder', size: 'Medium' }] : []),
              { type: 'TextBlock', text: message.bodyText, wrap: true },
            ],
          },
        }],
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      })

      if (!res.ok) return { success: false, error: `Teams webhook: ${res.status}` }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  isConfigured(): boolean {
    return !!process.env.M365_TEAMS_WEBHOOK_URL
  }
}
