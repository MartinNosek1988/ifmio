import { Injectable, Logger } from '@nestjs/common'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channel.interface'

@Injectable()
export class WhatsAppProvider implements ChannelProvider {
  readonly channelName = 'whatsapp'
  private readonly logger = new Logger(WhatsAppProvider.name)

  async send(message: ChannelMessage): Promise<ChannelResult> {
    const phone = message.recipient.phone
    if (!phone?.startsWith('+')) {
      return { success: false, error: 'Telefon musí být v E.164 formátu (+420...)' }
    }

    const phoneId = process.env.WHATSAPP_PHONE_ID
    const token = process.env.WHATSAPP_TOKEN
    if (!phoneId || !token) {
      return { success: false, error: 'WhatsApp není nakonfigurován' }
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace('+', ''),
          type: 'text',
          text: { body: message.bodyText },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const errMsg = (err as any).error?.message || `HTTP ${res.status}`
        this.logger.error(`WhatsApp send failed: ${errMsg}`)
        return { success: false, error: errMsg }
      }

      const data = await res.json()
      return {
        success: true,
        externalId: (data as any).messages?.[0]?.id,
      }
    } catch (err: any) {
      this.logger.error(`WhatsApp error: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  isConfigured(): boolean {
    return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
  }
}
