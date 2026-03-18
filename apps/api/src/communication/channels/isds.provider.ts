import { Injectable, Logger } from '@nestjs/common'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channel.interface'

@Injectable()
export class IsdsProvider implements ChannelProvider {
  readonly channelName = 'isds'
  private readonly logger = new Logger(IsdsProvider.name)

  async send(message: ChannelMessage): Promise<ChannelResult> {
    const dataBoxId = message.recipient.dataBoxId
    if (!dataBoxId || !/^[a-z0-9]{7}$/i.test(dataBoxId)) {
      return { success: false, error: 'Neplatné ID datové schránky (7 alfanumerických znaků)' }
    }

    // TODO: Real ISDS SOAP API implementation
    // Requires certificate or username+password from mojedatovaschranka.cz
    this.logger.warn(`ISDS stub: would send datová zpráva to ${dataBoxId} — subject: ${message.subject}`)

    return {
      success: false,
      error: 'ISDS: integrace není implementována — vyžaduje SOAP připojení k datovým schránkám',
    }
  }

  isConfigured(): boolean {
    return !!(process.env.ISDS_USERNAME && process.env.ISDS_PASSWORD)
  }
}
