export interface ChannelProvider {
  readonly channelName: string
  send(message: ChannelMessage): Promise<ChannelResult>
  isConfigured(): boolean
}

export interface ChannelMessage {
  recipient: {
    name?: string
    email?: string
    phone?: string
    dataBoxId?: string
    address?: {
      name: string
      street: string
      city: string
      zip: string
      country?: string
    }
  }
  subject: string
  bodyText: string
  bodyHtml?: string
  pdfBuffer?: Buffer
  metadata?: Record<string, unknown>
}

export interface ChannelResult {
  success: boolean
  externalId?: string
  error?: string
  cost?: number
}
