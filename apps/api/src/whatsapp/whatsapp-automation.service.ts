import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WhatsAppProvider } from '../communication/channels/whatsapp.provider'

@Injectable()
export class WhatsAppAutomationService {
  private readonly logger = new Logger(WhatsAppAutomationService.name)

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppProvider,
  ) {}

  // ─── Payment reminder (3 days before due) ──────────────────

  async sendPaymentReminders(): Promise<{ sent: number }> {
    if (!this.whatsapp.isConfigured()) return { sent: 0 }

    const threeDays = new Date()
    threeDays.setDate(threeDays.getDate() + 3)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDay = threeDays.getDate()

    // Find active prescriptions with dueDay matching 3 days from now
    const prescriptions = await this.prisma.prescription.findMany({
      where: { status: 'active', dueDay },
      include: {
        unit: true,
        resident: true,
        property: { select: { name: true } },
      },
      take: 100,
    })

    let sent = 0
    for (const p of prescriptions) {
      // Find party phone via resident → party or unit → tenancy → party
      const phone = await this.findPhoneForUnit(p.tenantId, p.unitId)
      if (!phone) continue

      const amount = Number(p.amount).toLocaleString('cs-CZ')
      const msg = `Připomínka platby — ${p.property?.name ?? ''}\n` +
        `Záloha: ${amount} Kč\nVS: ${p.variableSymbol ?? '—'}\n` +
        `Splatnost: ${dueDay}. ${threeDays.getMonth() + 1}. ${threeDays.getFullYear()}`

      await this.sendIfPhone(p.tenantId, phone, msg)
      sent++
      await this.delay(2000) // Rate limit
    }

    this.logger.log(`Payment reminders sent: ${sent}`)
    return { sent }
  }

  // ─── Payment received confirmation ─────────────────────────

  async sendPaymentConfirmation(tenantId: string, transactionId: string): Promise<void> {
    if (!this.whatsapp.isConfigured()) return

    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId },
      include: { prescription: { include: { unit: true, property: true } } },
    })
    if (!tx?.prescription?.unitId) return

    const phone = await this.findPhoneForUnit(tenantId, tx.prescription.unitId)
    if (!phone) return

    const amount = Number(tx.amount).toLocaleString('cs-CZ')
    const msg = `✅ Platba přijata: ${amount} Kč\n` +
      `Nemovitost: ${tx.prescription.property?.name ?? ''}\n` +
      `Přiřazeno k: ${tx.prescription.description ?? tx.prescription.variableSymbol ?? '—'}`

    await this.sendIfPhone(tenantId, phone, msg)
  }

  // ─── Ticket status change ─────────────────────────────────

  async sendTicketStatusUpdate(tenantId: string, ticketId: string): Promise<void> {
    if (!this.whatsapp.isConfigured()) return

    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: { unit: true, property: true },
    })
    if (!ticket?.unitId) return

    const phone = await this.findPhoneForUnit(tenantId, ticket.unitId)
    if (!phone) return

    const statusLabels: Record<string, string> = { open: 'Otevřený', in_progress: 'V řešení', resolved: 'Vyřešený', closed: 'Uzavřený' }
    const msg = `Požadavek #${ticket.number}: ${ticket.title}\nStav: ${statusLabels[ticket.status] ?? ticket.status}`

    await this.sendIfPhone(tenantId, phone, msg)
  }

  // ─── Lease expiration warning (30 days) ────────────────────

  async sendLeaseExpirationWarnings(): Promise<{ sent: number }> {
    if (!this.whatsapp.isConfigured()) return { sent: 0 }

    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const today = new Date()

    const expiring = await this.prisma.tenancy.findMany({
      where: {
        isActive: true,
        validTo: { gte: today, lte: thirtyDays },
      },
      include: {
        party: true,
        unit: { include: { property: true } },
      },
      take: 100,
    })

    let sent = 0
    for (const t of expiring) {
      if (!t.party.phone) continue
      const phone = t.party.phone.startsWith('+') ? t.party.phone : `+${t.party.phone}`
      const validTo = t.validTo ? t.validTo.toLocaleDateString('cs-CZ') : '—'
      const msg = `Upozornění: Vaše nájemní smlouva pro ${t.unit?.name ?? '—'} (${t.unit?.property?.name ?? ''}) ` +
        `končí ${validTo}.\nKontaktujte prosím správce ohledně prodloužení.`

      await this.sendIfPhone(t.tenantId, phone, msg)
      sent++
      await this.delay(2000)
    }

    this.logger.log(`Lease expiration warnings sent: ${sent}`)
    return { sent }
  }

  // ─── Daily digest for manager ──────────────────────────────

  async sendDailyDigest(): Promise<{ sent: number }> {
    if (!this.whatsapp.isConfigured()) return { sent: 0 }

    // Find all tenants and their admin users with phone
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        users: { where: { role: { in: ['tenant_owner', 'tenant_admin'] }, isActive: true } },
      },
    })

    let sent = 0
    for (const tenant of tenants) {
      for (const user of tenant.users) {
        // Find Party by user email to get phone
        const party = await this.prisma.party.findFirst({
          where: { tenantId: tenant.id, email: user.email, isActive: true },
        })
        if (!party?.phone) continue

        const [openTickets, overduePayments, todayWOs] = await Promise.all([
          this.prisma.helpdeskTicket.count({ where: { tenantId: tenant.id, status: { in: ['open', 'in_progress'] } } }),
          this.prisma.prescription.count({ where: { tenantId: tenant.id, status: 'active' } }),
          this.prisma.workOrder.count({ where: { tenantId: tenant.id, status: { in: ['nova', 'v_reseni'] } } }),
        ])

        const phone = party.phone.startsWith('+') ? party.phone : `+${party.phone}`
        const msg = `☀️ Dobré ráno — přehled ifmio\n\n` +
          `Otevřené požadavky: ${openTickets}\n` +
          `Aktivní předpisy: ${overduePayments}\n` +
          `Úkoly k řešení: ${todayWOs}\n\n` +
          `Detaily najdete v aplikaci ifmio.`

        await this.sendIfPhone(tenant.id, phone, msg)
        sent++
        await this.delay(2000)
      }
    }

    this.logger.log(`Daily digests sent: ${sent}`)
    return { sent }
  }

  // ─── Overdue payment alert to manager ──────────────────────

  async sendOverdueAlerts(): Promise<{ sent: number }> {
    if (!this.whatsapp.isConfigured()) return { sent: 0 }
    // TODO: Implement when prescription payment tracking is mature
    // Find prescriptions overdue > 14 days, group by property, notify manager
    return { sent: 0 }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async findPhoneForUnit(tenantId: string, unitId: string | null): Promise<string | null> {
    if (!unitId) return null
    const tenancy = await this.prisma.tenancy.findFirst({
      where: { unitId, isActive: true, tenantId },
      include: { party: true },
    })
    if (tenancy?.party?.phone) {
      return tenancy.party.phone.startsWith('+') ? tenancy.party.phone : `+${tenancy.party.phone}`
    }
    return null
  }

  private async sendIfPhone(tenantId: string, phone: string, message: string): Promise<void> {
    try {
      await this.whatsapp.send({ recipient: { phone }, subject: '', bodyText: message })
      await this.prisma.outboxLog.create({
        data: { tenantId, channel: 'whatsapp_auto', recipient: phone, subject: message.substring(0, 100), status: 'sent' },
      })
    } catch (err: any) {
      this.logger.error(`Auto-send failed to ${phone}: ${err.message}`)
      await this.prisma.outboxLog.create({
        data: { tenantId, channel: 'whatsapp_auto', recipient: phone, subject: message.substring(0, 100), status: 'failed', error: err.message },
      }).catch(() => {})
    }
  }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }
}
