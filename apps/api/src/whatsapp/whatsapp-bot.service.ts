import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { HelpdeskService } from '../helpdesk/helpdesk.service'
import { WhatsAppProvider } from '../communication/channels/whatsapp.provider'
import type { AuthUser } from '@ifmio/shared-types'

interface SenderContext {
  party: any
  tenantId: string
  propertyId?: string
  unitId?: string
  propertyName?: string
  unitName?: string
  role: 'tenant' | 'owner'
}

interface IntentResult {
  action: string
  data: any
  confidence: number
  directResponse?: string
}

interface ConversationEntry {
  messages: Array<{ role: string; content: string }>
  lastActivity: number
}

const CONV_TTL = 5 * 60_000 // 5 minutes
const CONV_CLEANUP = 30 * 60_000 // 30 minutes

@Injectable()
export class WhatsAppBotService {
  private readonly logger = new Logger(WhatsAppBotService.name)
  private conversations = new Map<string, ConversationEntry>()

  constructor(
    private prisma: PrismaService,
    private helpdesk: HelpdeskService,
    private whatsapp: WhatsAppProvider,
  ) {
    // Cleanup old conversations every 30 min
    setInterval(() => this.cleanupConversations(), CONV_CLEANUP)
  }

  async processIncomingMessage(phone: string, text: string, messageId: string): Promise<void> {
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

    const sender = await this.identifySender(normalizedPhone)
    if (!sender) {
      await this.reply(normalizedPhone,
        'Dobrý den, váš telefon není registrován v systému ifmio. ' +
        'Kontaktujte prosím svého správce nemovitosti.')
      return
    }

    // Add to conversation history
    this.addToConversation(normalizedPhone, 'user', text)

    const intent = await this.classifyIntent(text, sender, normalizedPhone)
    await this.executeIntent(intent, text, sender, normalizedPhone)
    await this.logIncoming(sender, normalizedPhone, text, messageId, intent.action)
  }

  private async identifySender(phone: string): Promise<SenderContext | null> {
    const party = await this.prisma.party.findFirst({
      where: {
        OR: [
          { phone },
          { phone: phone.replace('+420', '') },
          { phone: phone.replace('+', '') },
        ],
        isActive: true,
      },
      include: {
        tenancies: {
          where: { isActive: true },
          include: { unit: { include: { property: true } } },
          take: 1,
        },
        unitOwnerships: {
          where: { isActive: true },
          include: { unit: { include: { property: true } } },
          take: 1,
        },
      },
    })

    if (!party) return null

    const tenancy = party.tenancies?.[0]
    const ownership = party.unitOwnerships?.[0]
    const unit = tenancy?.unit || ownership?.unit
    const property = unit?.property

    return {
      party,
      tenantId: party.tenantId,
      propertyId: property?.id,
      unitId: unit?.id,
      propertyName: property?.name,
      unitName: unit?.name,
      role: tenancy ? 'tenant' : 'owner',
    }
  }

  private async classifyIntent(text: string, sender: SenderContext, phone: string): Promise<IntentResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { action: 'GENERAL_QUESTION', data: {}, confidence: 0,
        directResponse: 'AI asistent není momentálně dostupný. Kontaktujte prosím správce.' }
    }

    const conversation = this.conversations.get(phone)
    const recentMessages = conversation?.messages.slice(-4) ?? []

    const systemPrompt = `Jsi klasifikátor zpráv pro systém správy nemovitostí ifmio.
Analyzuj zprávu od ${sender.role === 'tenant' ? 'nájemce' : 'vlastníka'} (${sender.party.displayName}).
Nemovitost: ${sender.propertyName ?? 'neuvedeno'}, Jednotka: ${sender.unitName ?? 'neuvedeno'}.

Možné intenty:
- CREATE_TICKET: Nahlášení závady, požadavek na opravu, stížnost
  → Extrahuj: title (krátký popis), description (detail), category (plumbing/electrical/hvac/structural/cleaning/general/other)
- METER_READING: Nahlášení stavu měřidla/odečtu
  → Extrahuj: meterType (voda_studena/voda_tepla/elektrina/plyn/teplo), value (číslo)
- CHECK_BALANCE: Dotaz na stav účtu, platby, nedoplatky, přeplatky
- CHECK_TICKET: Dotaz na stav požadavku/ticketu
  → Extrahuj: ticketNumber (pokud zmíněno)
- GENERAL_QUESTION: Obecný dotaz — odpověz přímo

Odpověz POUZE validním JSON:
{"action":"...","data":{...},"confidence":0.0-1.0,"directResponse":"..."}`

    const messages = [
      ...recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ]

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages,
        }),
      })

      const data = await res.json()
      const responseText = (data as any).content?.[0]?.text || ''
      return JSON.parse(responseText)
    } catch (err: any) {
      this.logger.error(`AI classification failed: ${err.message}`)
      return { action: 'GENERAL_QUESTION', data: {}, confidence: 0,
        directResponse: 'Omlouvám se, systém je momentálně nedostupný. Zkuste to prosím později.' }
    }
  }

  private async executeIntent(intent: IntentResult, _text: string, sender: SenderContext, phone: string): Promise<void> {
    switch (intent.action) {
      case 'CREATE_TICKET': {
        const ticket = await this.createTicket(sender, intent.data)
        const replyText = ticket
          ? `✅ Požadavek #${ticket.number} vytvořen: ${intent.data.title || 'Nový požadavek'}\n` +
            `Nemovitost: ${sender.propertyName ?? '—'}\n` +
            `Stav: Otevřený\n\nBudeme vás informovat o průběhu řešení.`
          : '❌ Požadavek se nepodařilo vytvořit. Zkuste to prosím znovu.'
        this.addToConversation(phone, 'assistant', replyText)
        await this.reply(phone, replyText)
        break
      }

      case 'METER_READING': {
        const result = await this.saveMeterReading(sender, intent.data)
        const replyText = result.success
          ? `✅ Odečet uložen: ${intent.data.value}\nJednotka: ${sender.unitName ?? '—'}\nDatum: ${new Date().toLocaleDateString('cs-CZ')}`
          : `❌ Odečet se nepodařilo uložit: ${result.error}\nZkuste formát: "Stav vodoměru: 145.3"`
        this.addToConversation(phone, 'assistant', replyText)
        await this.reply(phone, replyText)
        break
      }

      case 'CHECK_BALANCE': {
        const replyText = await this.getBalance(sender)
        this.addToConversation(phone, 'assistant', replyText)
        await this.reply(phone, replyText)
        break
      }

      case 'CHECK_TICKET': {
        const replyText = await this.getTicketStatus(sender, intent.data?.ticketNumber)
        this.addToConversation(phone, 'assistant', replyText)
        await this.reply(phone, replyText)
        break
      }

      default: {
        const replyText = intent.directResponse ||
          'Dobrý den, můžete:\n• Nahlásit závadu (např. "Teče kohoutek v koupelně")\n' +
          '• Nahlásit stav měřidla (např. "Stav vodoměru: 145.3")\n' +
          '• Zjistit stav účtu (např. "Jaký mám zůstatek?")\n' +
          '• Zjistit stav požadavku (např. "Stav požadavku #42")'
        this.addToConversation(phone, 'assistant', replyText)
        await this.reply(phone, replyText)
      }
    }
  }

  // ─── Actions ──────────────────────────────────────────────────

  private async createTicket(sender: SenderContext, data: any): Promise<any> {
    try {
      // Construct synthetic AuthUser for helpdesk service
      const user: AuthUser = {
        id: 'whatsapp-bot',
        tenantId: sender.tenantId,
        role: 'tenant_owner',
        email: 'whatsapp-bot@ifmio.cz',
        name: 'WhatsApp Bot',
      }

      return await this.helpdesk.createTicket(user, {
        title: data.title || 'Požadavek z WhatsApp',
        description: `${data.description || ''}\n\n[Zdroj: WhatsApp — ${sender.party.displayName}]`,
        category: data.category || 'general',
        priority: 'medium',
        propertyId: sender.propertyId,
        unitId: sender.unitId,
      })
    } catch (err: any) {
      this.logger.error(`Failed to create ticket: ${err.message}`)
      return null
    }
  }

  private async saveMeterReading(sender: SenderContext, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!sender.unitId) return { success: false, error: 'Jednotka nenalezena' }
      if (!data.value || isNaN(Number(data.value))) return { success: false, error: 'Neplatná hodnota' }

      const meterType = data.meterType || 'voda_studena'
      const meter = await this.prisma.meter.findFirst({
        where: { unitId: sender.unitId, meterType: meterType as any, isActive: true },
      })
      if (!meter) return { success: false, error: `Měřidlo typu '${meterType}' nenalezeno` }

      await this.prisma.meterReading.create({
        data: {
          meterId: meter.id,
          readingDate: new Date(),
          value: Number(data.value),
          source: 'whatsapp',
        },
      })

      // Update meter lastReading
      await this.prisma.meter.update({
        where: { id: meter.id },
        data: { lastReading: Number(data.value), lastReadingDate: new Date() },
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  private async getBalance(sender: SenderContext): Promise<string> {
    try {
      if (!sender.propertyId || !sender.unitId) {
        return 'Informace o zůstatku nejsou dostupné — jednotka nenalezena.'
      }

      const account = await this.prisma.ownerAccount.findFirst({
        where: { tenantId: sender.tenantId, unitId: sender.unitId },
      })

      if (!account) {
        return `Konto pro ${sender.unitName ?? 'vaši jednotku'} zatím nebylo založeno.\nPro detailní informace kontaktujte správce.`
      }

      const balance = Number(account.currentBalance)
      const formatted = Math.abs(balance).toLocaleString('cs-CZ', { minimumFractionDigits: 0 })

      if (balance > 0) {
        return `Stav konta (${sender.unitName}):\nNedoplatek: ${formatted} Kč\nProsíme o úhradu.`
      } else if (balance < 0) {
        return `Stav konta (${sender.unitName}):\nPřeplatek: ${formatted} Kč`
      }
      return `Stav konta (${sender.unitName}):\nZůstatek: 0 Kč — vše uhrazeno.`
    } catch {
      return 'Informace o zůstatku nejsou momentálně dostupné.'
    }
  }

  private async getTicketStatus(sender: SenderContext, ticketNumber?: string): Promise<string> {
    try {
      if (ticketNumber) {
        const num = parseInt(ticketNumber)
        if (isNaN(num)) return 'Neplatné číslo požadavku.'

        const ticket = await this.prisma.helpdeskTicket.findFirst({
          where: { tenantId: sender.tenantId, number: num },
        })
        if (!ticket) return `Požadavek #${ticketNumber} nebyl nalezen.`

        return `Požadavek #${ticket.number}: ${ticket.title}\n` +
          `Stav: ${this.translateStatus(ticket.status)}\n` +
          `Priorita: ${this.translatePriority(ticket.priority)}\n` +
          `Vytvořeno: ${ticket.createdAt.toLocaleDateString('cs-CZ')}`
      }

      const tickets = await this.prisma.helpdeskTicket.findMany({
        where: {
          tenantId: sender.tenantId,
          ...(sender.unitId ? { unitId: sender.unitId } : {}),
          status: { notIn: ['closed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      if (tickets.length === 0) return 'Nemáte žádné otevřené požadavky.'

      return 'Vaše požadavky:\n' +
        tickets.map(t => `#${t.number} — ${t.title} (${this.translateStatus(t.status)})`).join('\n')
    } catch {
      return 'Informace o požadavcích nejsou momentálně dostupné.'
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async reply(phone: string, text: string): Promise<void> {
    try {
      await this.whatsapp.send({ recipient: { phone }, subject: '', bodyText: text })
    } catch (err: any) {
      this.logger.error(`Failed to reply to ${phone}: ${err.message}`)
    }
  }

  private addToConversation(phone: string, role: string, content: string) {
    let conv = this.conversations.get(phone)
    if (!conv || Date.now() - conv.lastActivity > CONV_TTL) {
      conv = { messages: [], lastActivity: Date.now() }
      this.conversations.set(phone, conv)
    }
    conv.messages.push({ role, content })
    conv.lastActivity = Date.now()
    // Keep only last 10 messages
    if (conv.messages.length > 10) conv.messages = conv.messages.slice(-10)
  }

  private cleanupConversations() {
    const now = Date.now()
    for (const [phone, conv] of this.conversations) {
      if (now - conv.lastActivity > CONV_CLEANUP) {
        this.conversations.delete(phone)
      }
    }
  }

  private async logIncoming(sender: SenderContext, phone: string, text: string, messageId: string, action: string) {
    try {
      await this.prisma.outboxLog.create({
        data: {
          tenantId: sender.tenantId,
          channel: 'whatsapp_incoming',
          recipient: phone,
          subject: `[${action}] ${text.substring(0, 100)}`,
          status: 'received',
          externalId: messageId,
        },
      })
    } catch (err) {
      this.logger.error(`Failed to log incoming message: ${err}`)
    }
  }

  private translateStatus(status: string): string {
    return { open: 'Otevřený', in_progress: 'V řešení', resolved: 'Vyřešený', closed: 'Uzavřený' }[status] || status
  }

  private translatePriority(priority: string): string {
    return { low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní' }[priority] || priority
  }
}
