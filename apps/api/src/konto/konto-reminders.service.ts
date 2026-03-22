import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import PDFDocument from 'pdfkit'
import * as QRCode from 'qrcode'

@Injectable()
export class KontoRemindersService {
  constructor(private prisma: PrismaService) {}

  async generateReminders(
    tenantId: string,
    propertyId: string,
    options: { minAmount?: number; minDaysOverdue?: number }
  ) {
    const minAmount = options.minAmount ?? 100
    const minDays = options.minDaysOverdue ?? 15

    // Get debtor accounts
    const accounts = await this.prisma.ownerAccount.findMany({
      where: { tenantId, propertyId, currentBalance: { gte: minAmount } },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        entries: {
          where: { type: 'DEBIT' },
          orderBy: { postingDate: 'asc' },
          take: 1,
          select: { postingDate: true },
        },
      },
    })

    const now = new Date()
    const created: any[] = []
    const GRACE_PERIOD_DAYS = 7

    for (const acc of accounts) {
      // Check oldest debit date
      const oldestDebit = acc.entries[0]
      if (!oldestDebit) continue
      const daysOverdue = Math.floor((now.getTime() - oldestDebit.postingDate.getTime()) / 86_400_000)
      if (daysOverdue < minDays) continue

      // Grace period: skip if there was a recent CREDIT that reduced balance
      const recentCredit = await this.prisma.ledgerEntry.findFirst({
        where: {
          accountId: acc.id,
          type: 'CREDIT',
          postingDate: { gte: new Date(now.getTime() - GRACE_PERIOD_DAYS * 86_400_000) },
        },
        orderBy: { postingDate: 'desc' },
      })
      if (recentCredit) continue // Recently paid — grace period active

      // Check for existing active reminder (DRAFT or SENT)
      const existingActive = await this.prisma.kontoReminder.findFirst({
        where: { accountId: acc.id, status: { in: ['DRAFT', 'SENT'] } },
      })
      if (existingActive) continue

      // Determine reminder level
      const prevCount = await this.prisma.kontoReminder.count({
        where: { accountId: acc.id },
      })
      const level = Math.min(prevCount + 1, 3)

      // Generate text and due date based on level
      const deadlineDays = level === 1 ? 15 : level === 2 ? 10 : 7
      const dueDate = new Date(now.getTime() + deadlineDays * 86_400_000)

      const residentName = acc.resident.isLegalEntity && acc.resident.companyName
        ? acc.resident.companyName
        : `${acc.resident.firstName} ${acc.resident.lastName}`

      const text = this.generateReminderText(
        level, residentName, acc.unit.name, acc.property.name,
        new Decimal(acc.currentBalance), oldestDebit.postingDate, dueDate,
      )

      const reminder = await this.prisma.kontoReminder.create({
        data: {
          tenantId,
          propertyId,
          accountId: acc.id,
          residentId: acc.residentId,
          unitId: acc.unitId,
          reminderNumber: level,
          amount: acc.currentBalance,
          dueDate,
          status: 'DRAFT',
          generatedText: text,
        },
        include: {
          resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
          unit: { select: { id: true, name: true } },
        },
      })

      created.push({
        ...reminder,
        amount: Number(reminder.amount),
        dueDate: reminder.dueDate.toISOString(),
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
      })
    }

    return created
  }

  private generateReminderText(
    level: number,
    residentName: string,
    unitName: string,
    propertyName: string,
    amount: Decimal,
    oldestDebtDate: Date,
    dueDate: Date,
  ): string {
    const fmtAmount = Number(amount).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })
    const fmtOldest = oldestDebtDate.toLocaleDateString('cs-CZ')
    const fmtDue = dueDate.toLocaleDateString('cs-CZ')

    if (level === 1) {
      return `Vážený/á ${residentName},\n\ndovolujeme si Vás upozornit, že na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName} evidujeme nedoplatek ve výši ${fmtAmount} Kč.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nProsíme o úhradu do ${fmtDue}.\n\nS pozdravem,\nspráva objektu`
    }
    if (level === 2) {
      return `Vážený/á ${residentName},\n\nopětovně Vás upozorňujeme na neuhrazený nedoplatek ve výši ${fmtAmount} Kč na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName}.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nUpozorňujeme, že v případě dalšího prodlení může být dluh navýšen o úrok z prodlení. Prosíme o úhradu nejpozději do ${fmtDue}.\n\nS pozdravem,\nspráva objektu`
    }
    return `Vážený/á ${residentName},\n\nTOTO JE POSLEDNÍ UPOMÍNKA. Na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName} nadále evidujeme nedoplatek ve výši ${fmtAmount} Kč.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nPokud nebude dluh uhrazen do ${fmtDue}, budeme nuceni přistoupit k vymáhání pohledávky právní cestou, včetně uplatnění nákladů řízení.\n\nS pozdravem,\nspráva objektu`
  }

  /**
   * Auto-resolve all DRAFT/SENT reminders for an account when balance reaches 0.
   * Called from matching.service.ts after a successful KONTO match posts credit.
   */
  async checkAndAutoResolve(tenantId: string, accountId: string): Promise<number> {
    const account = await this.prisma.ownerAccount.findFirst({
      where: { id: accountId, tenantId },
      select: { currentBalance: true },
    })
    if (!account) return 0

    // Only auto-resolve when balance reaches 0 or below (fully paid)
    if (Number(account.currentBalance) > 0) return 0

    const activeReminders = await this.prisma.kontoReminder.findMany({
      where: {
        accountId,
        tenantId,
        status: { in: ['DRAFT', 'SENT'] },
      },
    })

    if (activeReminders.length === 0) return 0

    await this.prisma.kontoReminder.updateMany({
      where: {
        id: { in: activeReminders.map(r => r.id) },
      },
      data: {
        status: 'RESOLVED',
        note: 'Automaticky vyřešeno — dluh uhrazen',
      },
    })

    return activeReminders.length
  }

  async markAsSent(tenantId: string, reminderId: string, method: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (reminder.status !== 'DRAFT') throw new BadRequestException('Odeslat lze pouze upomínku ve stavu DRAFT')

    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'SENT', sentAt: new Date(), sentMethod: method as any },
    })
  }

  async markAsResolved(tenantId: string, reminderId: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (!['DRAFT', 'SENT', 'ACKNOWLEDGED'].includes(reminder.status)) {
      throw new BadRequestException(`Upomínku ve stavu "${reminder.status}" nelze označit jako vyřešenou`)
    }
    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'RESOLVED' },
    })
  }

  async cancelReminder(tenantId: string, reminderId: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (!['DRAFT', 'SENT'].includes(reminder.status)) {
      throw new BadRequestException(`Upomínku ve stavu "${reminder.status}" nelze zrušit`)
    }
    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'CANCELLED' },
    })
  }

  async getPropertyReminders(
    tenantId: string,
    propertyId: string,
    filters?: { status?: string; accountId?: string }
  ) {
    const where: any = { tenantId, propertyId }
    if (filters?.status) where.status = filters.status
    if (filters?.accountId) where.accountId = filters.accountId

    const items = await this.prisma.kontoReminder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
      },
    })

    return items.map(r => ({
      ...r,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  async getAccountReminders(tenantId: string, accountId: string) {
    const items = await this.prisma.kontoReminder.findMany({
      where: { tenantId, accountId },
      orderBy: { createdAt: 'desc' },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
      },
    })
    return items.map(r => ({
      ...r,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  // ─── PDF WITH QR PAYMENT CODE ──────────────────────────────────

  async generateReminderPdf(tenantId: string, reminderId: string): Promise<PDFKit.PDFDocument> {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
      include: {
        property: true,
        unit: true,
        resident: true,
        account: true,
      },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')

    const property = reminder.property
    const resident = reminder.resident
    const ownerName = resident?.isLegalEntity && resident?.companyName
      ? resident.companyName
      : `${resident?.firstName ?? ''} ${resident?.lastName ?? ''}`
    const amount = Number(reminder.amount)
    const fmtCzk = (n: number) => Math.round(n).toLocaleString('cs-CZ') + ' Kč'

    const LEVEL_TITLES = ['1. UPOMÍNKA', '2. UPOMÍNKA', 'PŘEDŽALOBNÍ VÝZVA']
    const title = LEVEL_TITLES[Math.min(reminder.reminderNumber - 1, 2)] ?? `UPOMÍNKA č. ${reminder.reminderNumber}`

    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    // Header — property info
    doc.fontSize(11).font('Helvetica-Bold').text(property.name)
    if (property.ico) doc.font('Helvetica').fontSize(9).text(`IČ: ${property.ico}`)
    doc.font('Helvetica').fontSize(9).text(`${property.address}, ${property.postalCode} ${property.city}`)
    doc.moveDown(1)

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' }).moveDown(1)

    // Greeting
    doc.fontSize(10).font('Helvetica')
    doc.text('Vážený vlastníku / nájemce,')
    doc.moveDown(0.5)

    if (reminder.reminderNumber === 1) {
      doc.text(`dovolujeme si Vás upozornit, že ke dni ${new Date().toLocaleDateString('cs-CZ')} evidujeme na Vašem kontě neuhrazený dluh.`)
    } else if (reminder.reminderNumber === 2) {
      doc.text(`navzdory naší předchozí upomínce evidujeme ke dni ${new Date().toLocaleDateString('cs-CZ')} na Vašem kontě stále neuhrazený dluh. Důrazně Vás žádáme o neprodlenou úhradu.`)
    } else {
      doc.text(`tímto Vás naposledy vyzýváme k úhradě dlužné částky. V případě neuhrazení do 15 dnů od doručení této výzvy budeme nuceni přistoupit k vymáhání soudní cestou.`)
    }
    doc.moveDown(1)

    // Owner + unit info
    doc.font('Helvetica-Bold').text('Vlastník: ', { continued: true }).font('Helvetica').text(ownerName)
    doc.font('Helvetica-Bold').text('Jednotka: ', { continued: true }).font('Helvetica').text(reminder.unit?.name ?? '—')
    doc.moveDown(1)

    // Debt amount
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333').moveDown(0.5)
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text(`DLUH CELKEM: ${fmtCzk(amount)}`, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica')
    doc.text(`Splatnost: ${reminder.dueDate.toLocaleDateString('cs-CZ')}`, { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333').moveDown(1)

    // Payment instructions
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { tenantId, propertyId: reminder.propertyId },
      select: { accountNumber: true, bankCode: true, iban: true },
    })

    if (bankAccount) {
      const acc = bankAccount.iban ?? `${bankAccount.accountNumber}/${bankAccount.bankCode}`
      doc.fontSize(10).font('Helvetica')
      doc.text(`Uhraďte na účet: ${acc}`)

      // Find VS from occupancy
      const occ = await this.prisma.occupancy.findFirst({
        where: { unitId: reminder.unitId, residentId: reminder.residentId, isActive: true },
        select: { variableSymbol: true },
      })
      if (occ?.variableSymbol) doc.text(`VS: ${occ.variableSymbol}`)
      doc.moveDown(1)

      // QR payment code
      try {
        const vs = occ?.variableSymbol ?? ''
        const spd = `SPD*1.0*ACC:${acc}*AM:${amount.toFixed(2)}*CC:CZK*X-VS:${vs}*MSG:Upominka*`
        const qrBuffer = await QRCode.toBuffer(spd, { width: 120, margin: 1 })
        doc.image(qrBuffer, 50, doc.y, { width: 80, height: 80 })
        doc.fontSize(7).text('QR Platba', 50, doc.y + 84, { width: 80, align: 'center' })
        doc.y += 100
      } catch { /* QR generation failed */ }
    }

    // Generated text from reminder
    if (reminder.generatedText) {
      doc.moveDown(0.5)
      doc.fontSize(9).font('Helvetica').text(reminder.generatedText, { lineGap: 3 })
    }

    // Footer
    doc.moveDown(2)
    doc.fontSize(9).font('Helvetica')
    doc.text(`V ${property.city ?? 'Praze'} dne ${new Date().toLocaleDateString('cs-CZ')}`)
    doc.moveDown(1)
    doc.text('S pozdravem, správce nemovitosti', { align: 'right' })

    doc.moveDown(2)
    doc.fontSize(7).fillColor('#aaa').text(`ifmio | ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }
}
