import { Injectable, Logger } from '@nestjs/common'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channel.interface'

@Injectable()
export class DopisOnlineProvider implements ChannelProvider {
  readonly channelName = 'letter'
  private readonly logger = new Logger(DopisOnlineProvider.name)

  async send(message: ChannelMessage): Promise<ChannelResult> {
    const addr = message.recipient.address
    if (!addr?.street || !addr?.city || !addr?.zip) {
      return { success: false, error: 'Neúplná adresa příjemce' }
    }
    if (!message.pdfBuffer) {
      return { success: false, error: 'Pro odeslání dopisu je vyžadován PDF dokument' }
    }

    // TODO: Real DopisOnline/PostServis API implementation
    // Requires API credentials from Česká pošta
    this.logger.warn(`DopisOnline stub: would send letter to ${addr.name}, ${addr.street}, ${addr.city} ${addr.zip}`)

    return {
      success: false,
      error: 'DopisOnline integrace vyžaduje API přístupy od České pošty',
      cost: 30,
    }
  }

  isConfigured(): boolean {
    return !!(process.env.DOPISONLINE_USERNAME && process.env.DOPISONLINE_PASSWORD)
  }
}
