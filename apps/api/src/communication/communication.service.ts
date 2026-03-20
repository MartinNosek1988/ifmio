import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { GoSmsProvider } from './channels/gosms.provider'
import { WhatsAppProvider } from './channels/whatsapp.provider'
import { DopisOnlineProvider } from './channels/dopisonline.provider'
import { IsdsProvider } from './channels/isds.provider'
import { TeamsChannelProvider } from './channels/teams.provider'
import type { ChannelProvider, ChannelMessage, ChannelResult } from './channels/channel.interface'

export interface OutboxResult extends ChannelResult {
  channel: string
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name)
  private readonly providers: Map<string, ChannelProvider>

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private goSms: GoSmsProvider,
    private whatsApp: WhatsAppProvider,
    private dopisOnline: DopisOnlineProvider,
    private isds: IsdsProvider,
    private teamsChannel: TeamsChannelProvider,
  ) {
    this.providers = new Map()
    this.providers.set('sms', goSms)
    this.providers.set('whatsapp', whatsApp)
    this.providers.set('letter', dopisOnline)
    this.providers.set('isds', isds)
    this.providers.set('teams', teamsChannel)
  }

  async sendMessage(
    tenantId: string,
    channels: string[],
    message: ChannelMessage,
  ): Promise<OutboxResult[]> {
    const results: OutboxResult[] = []

    for (const channel of channels) {
      if (channel === 'email') {
        const emailResult = await this.sendEmail(tenantId, message)
        results.push(emailResult)
        continue
      }

      const provider = this.providers.get(channel)
      if (!provider) {
        const r: OutboxResult = { channel, success: false, error: `Kanál '${channel}' není k dispozici` }
        await this.log(tenantId, channel, message, r)
        results.push(r)
        continue
      }

      if (!provider.isConfigured()) {
        const r: OutboxResult = { channel, success: false, error: `Kanál '${channel}' není nakonfigurován` }
        await this.log(tenantId, channel, message, r)
        results.push(r)
        continue
      }

      try {
        const result = await provider.send(message)
        const r: OutboxResult = { channel, ...result }
        await this.log(tenantId, channel, message, r)
        results.push(r)
      } catch (err: any) {
        const r: OutboxResult = { channel, success: false, error: err.message }
        await this.log(tenantId, channel, message, r)
        results.push(r)
      }
    }

    return results
  }

  getChannelStatuses(): Array<{ channel: string; label: string; configured: boolean }> {
    return [
      { channel: 'email', label: 'E-mail', configured: true }, // always via EmailService
      { channel: 'sms', label: 'SMS (GoSMS)', configured: this.goSms.isConfigured() },
      { channel: 'whatsapp', label: 'WhatsApp', configured: this.whatsApp.isConfigured() },
      { channel: 'letter', label: 'DopisOnline', configured: this.dopisOnline.isConfigured() },
      { channel: 'isds', label: 'Datové schránky', configured: this.isds.isConfigured() },
      { channel: 'teams', label: 'Microsoft Teams', configured: this.teamsChannel.isConfigured() },
    ]
  }

  async getOutboxLogs(tenantId: string, limit = 50) {
    return this.prisma.outboxLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  private async sendEmail(tenantId: string, message: ChannelMessage): Promise<OutboxResult> {
    const email = message.recipient.email
    if (!email) {
      const r: OutboxResult = { channel: 'email', success: false, error: 'Příjemce nemá e-mail' }
      await this.log(tenantId, 'email', message, r)
      return r
    }

    try {
      await this.emailService.send({
        to: email,
        subject: message.subject,
        html: message.bodyHtml ?? `<p>${message.bodyText}</p>`,
        text: message.bodyText,
      })
      const r: OutboxResult = { channel: 'email', success: true }
      await this.log(tenantId, 'email', message, r)
      return r
    } catch (err: any) {
      const r: OutboxResult = { channel: 'email', success: false, error: err.message }
      await this.log(tenantId, 'email', message, r)
      return r
    }
  }

  private async log(tenantId: string, channel: string, message: ChannelMessage, result: OutboxResult) {
    try {
      await this.prisma.outboxLog.create({
        data: {
          tenantId,
          channel,
          recipient: message.recipient.email ?? message.recipient.phone ?? message.recipient.dataBoxId ?? 'address',
          subject: message.subject,
          status: result.success ? 'sent' : 'failed',
          externalId: result.externalId,
          error: result.error,
          cost: result.cost,
        },
      })
    } catch (err) {
      this.logger.error(`Failed to log outbox entry: ${err}`)
    }
  }

  // ─── BULK SEND TO PROPERTY OWNERS/TENANTS ──────────────────────

  async bulkSendToProperty(tenantId: string, dto: {
    propertyId: string
    subject: string
    body: string
    recipientFilter: 'all' | 'owners' | 'tenants' | 'custom'
    recipientIds?: string[]
    unitGroupId?: string
    attachmentType?: 'evidencni_list' | 'predpis' | 'vyuctovani'
  }) {
    // Get recipients based on filter
    const occupancyWhere: Record<string, unknown> = {
      tenantId,
      unit: { propertyId: dto.propertyId },
      isActive: true,
    }

    if (dto.recipientFilter === 'owners') {
      occupancyWhere.role = 'owner'
    } else if (dto.recipientFilter === 'tenants') {
      occupancyWhere.role = 'tenant'
    }

    if (dto.unitGroupId) {
      const memberships = await this.prisma.unitGroupMembership.findMany({
        where: { unitGroupId: dto.unitGroupId },
        select: { unitId: true },
      })
      occupancyWhere.unitId = { in: memberships.map(m => m.unitId) }
    }

    const occupancies = await this.prisma.occupancy.findMany({
      where: occupancyWhere,
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
      },
    })

    // Filter by custom IDs if provided
    let recipients = occupancies
    if (dto.recipientFilter === 'custom' && dto.recipientIds?.length) {
      recipients = occupancies.filter(o => dto.recipientIds!.includes(o.id))
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const occ of recipients) {
      const email = occ.resident?.email
      if (!email) { skipped++; continue }

      const name = occ.resident.isLegalEntity && occ.resident.companyName
        ? occ.resident.companyName
        : `${occ.resident.firstName} ${occ.resident.lastName}`

      try {
        const ok = await this.emailService.send({
          to: email,
          subject: dto.subject,
          html: dto.body,
        })

        // Log is handled by the multi-channel dispatcher; for bulk we log directly
        await this.prisma.outboxLog.create({
          data: { tenantId, channel: 'email', recipient: email, subject: dto.subject, status: ok ? 'sent' : 'failed' },
        }).catch(() => {})

        if (ok) sent++
        else failed++
      } catch (err) {
        await this.prisma.outboxLog.create({
          data: { tenantId, channel: 'email', recipient: email, subject: dto.subject, status: 'failed', error: String(err) },
        }).catch(() => {})
        failed++
      }
    }

    return {
      total: recipients.length,
      sent,
      failed,
      skipped,
      recipientCount: recipients.length,
    }
  }
}
