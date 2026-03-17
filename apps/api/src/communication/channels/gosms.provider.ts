import { Injectable, Logger } from '@nestjs/common'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channel.interface'

const GOSMS_BASE = 'https://app.gosms.eu'

@Injectable()
export class GoSmsProvider implements ChannelProvider {
  readonly channelName = 'sms'
  private readonly logger = new Logger(GoSmsProvider.name)
  private accessToken: string | null = null
  private tokenExpiresAt = 0

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const clientId = process.env.GOSMS_CLIENT_ID
    const clientSecret = process.env.GOSMS_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new Error('GoSMS credentials not configured')

    const res = await fetch(`${GOSMS_BASE}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GoSMS auth failed: ${res.status} ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
    return this.accessToken!
  }

  async send(message: ChannelMessage): Promise<ChannelResult> {
    const phone = message.recipient.phone
    if (!phone?.startsWith('+')) {
      return { success: false, error: 'Telefon musí být v E.164 formátu (+420...)' }
    }

    if (message.bodyText.length > 160) {
      this.logger.warn(`SMS text is ${message.bodyText.length} chars (max 160) — will be split into multiple SMS`)
    }

    try {
      const token = await this.getToken()
      const channelId = process.env.GOSMS_CHANNEL_ID ? Number(process.env.GOSMS_CHANNEL_ID) : undefined

      const res = await fetch(`${GOSMS_BASE}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.bodyText,
          recipients: phone,
          ...(channelId ? { channelId } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        this.logger.error(`GoSMS send failed: ${res.status} ${err.slice(0, 200)}`)
        return { success: false, error: `GoSMS chyba: ${res.status}` }
      }

      const data = await res.json()
      return { success: true, externalId: String(data.id ?? ''), cost: 1.5 }
    } catch (err: any) {
      this.logger.error(`GoSMS error: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  isConfigured(): boolean {
    return !!(process.env.GOSMS_CLIENT_ID && process.env.GOSMS_CLIENT_SECRET)
  }
}
