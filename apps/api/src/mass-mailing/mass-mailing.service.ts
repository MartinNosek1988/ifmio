import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto'
import type { CampaignChannel, CampaignRecipientType, MassMailingCampaign } from '@prisma/client'

export interface ResolvedRecipient {
  residentId?: string
  email?: string
  phone?: string
  name: string
}

@Injectable()
export class MassMailingService {
  private readonly logger = new Logger(MassMailingService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── LIST ──────────────────────────────────────────────────────

  async list(user: AuthUser, query: { status?: string; propertyId?: string; page?: number; limit?: number }) {
    const take = Math.min(query.limit ?? 25, 100)
    const skip = ((query.page ?? 1) - 1) * take

    const where: Record<string, unknown> = { tenantId: user.tenantId, deletedAt: null }
    if (query.status) where.status = query.status
    if (query.propertyId) where.propertyId = query.propertyId

    const [items, total] = await Promise.all([
      this.prisma.massMailingCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { _count: { select: { recipients: true } } },
      }),
      this.prisma.massMailingCampaign.count({ where }),
    ])

    return { items, total, page: query.page ?? 1, limit: take }
  }

  // ─── STATS ─────────────────────────────────────────────────────

  async stats(user: AuthUser) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const tenantWhere = { tenantId: user.tenantId, deletedAt: null }

    const [total, sentThisMonth, campaigns] = await Promise.all([
      this.prisma.massMailingCampaign.count({ where: tenantWhere }),
      this.prisma.massMailingCampaign.count({
        where: { ...tenantWhere, status: 'sent', sentAt: { gte: monthStart } },
      }),
      this.prisma.massMailingCampaign.findMany({
        where: { ...tenantWhere, status: 'sent', totalRecipients: { gt: 0 } },
        select: { sentCount: true, totalRecipients: true },
      }),
    ])

    const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
    const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)
    const avgSuccessRate = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0

    return { total, sentThisMonth, avgSuccessRate }
  }

  // ─── GET BY ID ─────────────────────────────────────────────────

  async getById(user: AuthUser, id: string) {
    const campaign = await this.prisma.massMailingCampaign.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { _count: { select: { recipients: true } }, property: { select: { id: true, name: true } } },
    })
    if (!campaign) throw new NotFoundException('Kampaň nenalezena')
    return campaign
  }

  // ─── CREATE ────────────────────────────────────────────────────

  async create(user: AuthUser, dto: CreateCampaignDto) {
    return this.prisma.massMailingCampaign.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        channel: dto.channel as CampaignChannel,
        recipientType: dto.recipientType as CampaignRecipientType,
        recipientIds: dto.recipientIds ?? [],
        propertyIds: dto.propertyIds ?? [],
        propertyId: dto.propertyId ?? null,
        createdBy: user.id,
      },
    })
  }

  // ─── UPDATE ────────────────────────────────────────────────────

  async update(user: AuthUser, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.getById(user, id)
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Upravit lze jen kampaň ve stavu draft')
    }

    return this.prisma.massMailingCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        channel: dto.channel as CampaignChannel,
        recipientType: dto.recipientType as CampaignRecipientType,
        recipientIds: dto.recipientIds ?? [],
        propertyIds: dto.propertyIds ?? [],
        propertyId: dto.propertyId ?? null,
      },
    })
  }

  // ─── REMOVE (soft delete) ──────────────────────────────────────

  async remove(user: AuthUser, id: string) {
    const campaign = await this.getById(user, id)
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Smazat lze jen kampaň ve stavu draft')
    }

    return this.prisma.massMailingCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // ─── PREVIEW RECIPIENTS ───────────────────────────────────────

  async previewRecipients(user: AuthUser, id: string) {
    const campaign = await this.getById(user, id)
    const resolved = await this.resolveRecipients(campaign)
    return {
      total: resolved.length,
      sample: resolved.slice(0, 20),
    }
  }

  // ─── SEND ─────────────────────────────────────────────────────

  async sendCampaign(user: AuthUser, id: string) {
    const campaign = await this.getById(user, id)
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException('Odeslat lze jen kampaň ve stavu draft nebo scheduled')
    }

    const resolved = await this.resolveRecipients(campaign)
    if (resolved.length === 0) {
      throw new BadRequestException('Žádní příjemci k odeslání')
    }

    // Create recipient records
    await this.prisma.campaignRecipient.createMany({
      data: resolved.map((r) => ({
        campaignId: id,
        residentId: r.residentId ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        name: r.name,
      })),
    })

    // Update campaign status
    await this.prisma.massMailingCampaign.update({
      where: { id },
      data: {
        status: 'sending',
        totalRecipients: resolved.length,
        sentAt: new Date(),
      },
    })

    // Dispatch async (fire-and-forget)
    this.dispatchCampaign(id, campaign, resolved).catch((err) => {
      this.logger.error(`Dispatch failed for campaign ${id}: ${err}`)
    })

    return { message: 'Kampaň se odesílá', totalRecipients: resolved.length }
  }

  // ─── SCHEDULE ──────────────────────────────────────────────────

  async scheduleCampaign(user: AuthUser, id: string, scheduledAt: string) {
    const campaign = await this.getById(user, id)
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Naplánovat lze jen kampaň ve stavu draft')
    }

    return this.prisma.massMailingCampaign.update({
      where: { id },
      data: { status: 'scheduled', scheduledAt: new Date(scheduledAt) },
    })
  }

  // ─── CANCEL ────────────────────────────────────────────────────

  async cancelCampaign(user: AuthUser, id: string) {
    const campaign = await this.getById(user, id)
    if (campaign.status !== 'scheduled' && campaign.status !== 'sending') {
      throw new BadRequestException('Zrušit lze jen kampaň ve stavu scheduled nebo sending')
    }

    return this.prisma.massMailingCampaign.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
  }

  // ─── GET RECIPIENTS ────────────────────────────────────────────

  async getRecipients(user: AuthUser, id: string, query: { status?: string; page?: number; limit?: number }) {
    await this.getById(user, id) // verify access
    const take = Math.min(query.limit ?? 25, 100)
    const skip = ((query.page ?? 1) - 1) * take

    const where: Record<string, unknown> = { campaignId: id }
    if (query.status) where.status = query.status

    const [items, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({ where, orderBy: { name: 'asc' }, take, skip }),
      this.prisma.campaignRecipient.count({ where }),
    ])

    return { items, total, page: query.page ?? 1, limit: take }
  }

  // ─── PREVIEW FROM PARAMS (no campaign needed) ─────────────────

  async previewRecipientsFromParams(
    user: AuthUser,
    params: { recipientType: string; propertyIds?: string[]; channel?: string },
  ) {
    const fakeCampaign = {
      tenantId: user.tenantId,
      recipientType: params.recipientType,
      propertyIds: params.propertyIds ?? [],
      propertyId: null,
      recipientIds: [],
      channel: params.channel ?? 'email',
    } as unknown as MassMailingCampaign

    const recipients = await this.resolveRecipientsWithProperty(fakeCampaign)
    return { total: recipients.length, recipients }
  }

  // ─── SCHEDULED CAMPAIGNS (cron, no AuthUser) ──────────────────

  async sendScheduledCampaigns(): Promise<number> {
    const due = await this.prisma.massMailingCampaign.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: new Date() }, deletedAt: null },
      select: { id: true, tenantId: true, createdBy: true },
    })

    let sent = 0
    for (const c of due) {
      try {
        // Atomically claim: only proceed if still scheduled (prevents duplicate sends)
        const claimed = await this.prisma.massMailingCampaign.updateMany({
          where: { id: c.id, status: 'scheduled' },
          data: { status: 'sending' },
        })
        if (claimed.count === 0) continue

        const fakeUser = {
          id: c.createdBy,
          tenantId: c.tenantId,
          role: 'tenant_admin',
          email: '',
          name: '',
        } as unknown as AuthUser
        await this.sendCampaign(fakeUser, c.id)
        sent++
      } catch (err) {
        this.logger.error(`Scheduled campaign ${c.id} failed: ${err}`)
      }
    }
    return sent
  }

  // ─── PRIVATE: RESOLVE RECIPIENTS ──────────────────────────────

  private async resolveRecipients(campaign: MassMailingCampaign): Promise<ResolvedRecipient[]> {
    const baseWhere: Record<string, unknown> = { tenantId: campaign.tenantId, isActive: true }
    if (campaign.propertyIds.length > 0) {
      baseWhere.propertyId = { in: campaign.propertyIds }
    } else if (campaign.propertyId) {
      baseWhere.propertyId = campaign.propertyId
    }

    let residents: Array<{ id: string; email: string | null; phone: string | null; firstName: string; lastName: string }>

    switch (campaign.recipientType) {
      case 'all_owners':
        residents = await this.prisma.resident.findMany({
          where: { ...baseWhere, role: 'owner' },
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        })
        break

      case 'all_tenants':
        residents = await this.prisma.resident.findMany({
          where: { ...baseWhere, role: 'tenant' },
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        })
        break

      case 'all_residents':
        residents = await this.prisma.resident.findMany({
          where: baseWhere,
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        })
        break

      case 'debtors':
        residents = await this.prisma.resident.findMany({
          where: { ...baseWhere, hasDebt: true },
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        })
        break

      case 'custom':
        if (!campaign.recipientIds.length) return []
        residents = await this.prisma.resident.findMany({
          where: { id: { in: campaign.recipientIds }, tenantId: campaign.tenantId, isActive: true },
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        })
        break

      default:
        return []
    }

    // Filter based on channel — need email for email, phone for sms
    return residents
      .filter((r) => {
        if (campaign.channel === 'email') return !!r.email
        if (campaign.channel === 'sms') return !!r.phone
        return !!r.email || !!r.phone // both
      })
      .map((r) => ({
        residentId: r.id,
        email: r.email ?? undefined,
        phone: r.phone ?? undefined,
        name: `${r.firstName} ${r.lastName}`,
      }))
  }

  // ─── PRIVATE: RESOLVE WITH PROPERTY (for preview) ──────────────

  private async resolveRecipientsWithProperty(campaign: MassMailingCampaign) {
    const baseWhere: Record<string, unknown> = { tenantId: campaign.tenantId, isActive: true }
    if (campaign.propertyIds.length > 0) {
      baseWhere.propertyId = { in: campaign.propertyIds }
    } else if (campaign.propertyId) {
      baseWhere.propertyId = campaign.propertyId
    }

    const select = {
      id: true, email: true, phone: true, firstName: true, lastName: true,
      property: { select: { id: true, name: true } },
    } as const

    type Row = { id: string; email: string | null; phone: string | null; firstName: string; lastName: string; property: { id: string; name: string } | null }
    let residents: Row[]

    switch (campaign.recipientType) {
      case 'all_owners':
        residents = await this.prisma.resident.findMany({ where: { ...baseWhere, role: 'owner' }, select })
        break
      case 'all_tenants':
        residents = await this.prisma.resident.findMany({ where: { ...baseWhere, role: 'tenant' }, select })
        break
      case 'all_residents':
        residents = await this.prisma.resident.findMany({ where: baseWhere, select })
        break
      case 'debtors':
        residents = await this.prisma.resident.findMany({ where: { ...baseWhere, hasDebt: true }, select })
        break
      case 'custom':
        if (!campaign.recipientIds.length) return []
        residents = await this.prisma.resident.findMany({
          where: { id: { in: campaign.recipientIds }, tenantId: campaign.tenantId, isActive: true },
          select,
        })
        break
      default:
        return []
    }

    return residents.map((r) => ({
      residentId: r.id,
      email: r.email ?? null,
      phone: r.phone ?? null,
      name: `${r.firstName} ${r.lastName}`,
      propertyName: r.property?.name ?? null,
      hasContact: campaign.channel === 'email' ? !!r.email : campaign.channel === 'sms' ? !!r.phone : !!(r.email || r.phone),
    }))
  }

  // ─── PRIVATE: DISPATCH ─────────────────────────────────────────

  private async dispatchCampaign(
    id: string,
    campaign: MassMailingCampaign,
    recipients: ResolvedRecipient[],
  ): Promise<void> {
    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      try {
        if ((campaign.channel === 'email' || campaign.channel === 'both') && recipient.email) {
          const html = this.interpolate(campaign.body, recipient)
          const subject = this.interpolate(campaign.subject, recipient)
          await this.email.send({ to: recipient.email, subject, html })
        }

        // TODO: SMS support via GoSmsProvider when properly configured
        // if ((campaign.channel === 'sms' || campaign.channel === 'both') && recipient.phone) {
        //   const text = this.stripHtml(this.interpolate(campaign.body, recipient))
        //   await this.gosms.send({ recipient: { phone: recipient.phone }, content: { text } })
        // }

        await this.prisma.campaignRecipient.updateMany({
          where: { campaignId: id, residentId: recipient.residentId ?? undefined },
          data: { status: 'sent', sentAt: new Date() },
        })
        sentCount++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        await this.prisma.campaignRecipient.updateMany({
          where: { campaignId: id, residentId: recipient.residentId ?? undefined },
          data: { status: 'failed', errorMessage },
        })
        failedCount++
        this.logger.warn(`Failed to send to ${recipient.email ?? recipient.phone}: ${errorMessage}`)
      }
    }

    await this.prisma.massMailingCampaign.update({
      where: { id },
      data: { status: 'sent', sentCount, failedCount },
    })

    this.logger.log(`Campaign ${id} dispatched: ${sentCount} sent, ${failedCount} failed`)
  }

  // ─── PRIVATE: INTERPOLATE ─────────────────────────────────────

  private interpolate(template: string, recipient: ResolvedRecipient): string {
    return template
      .replace(/\{\{jmeno\}\}/g, recipient.name)
      .replace(/\{\{email\}\}/g, recipient.email ?? '')
      .replace(/\{\{telefon\}\}/g, recipient.phone ?? '')
  }

  // ─── PRIVATE: STRIP HTML ──────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '')
  }
}
