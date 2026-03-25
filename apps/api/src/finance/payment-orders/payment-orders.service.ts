import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import PDFDocument from 'pdfkit'
import type { AuthUser } from '@ifmio/shared-types'

interface CreateItemDto {
  counterpartyName?: string
  counterpartyAccount: string
  counterpartyBankCode: string
  amount: number
  variableSymbol?: string
  specificSymbol?: string
  constantSymbol?: string
  description?: string
  invoiceId?: string
  prescriptionId?: string
}

@Injectable()
export class PaymentOrdersService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.paymentOrder.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        bankAccount: { select: { name: true, accountNumber: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    })
    return rows
  }

  async getDetail(user: AuthUser, id: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        bankAccount: { select: { name: true, accountNumber: true, bankCode: true, iban: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!order) throw new NotFoundException('Příkaz nenalezen')
    return { ...order, items: order.items.map(i => ({ ...i, amount: Number(i.amount) })) }
  }

  async create(user: AuthUser, dto: { bankAccountId: string; financialContextId: string; note?: string; items: CreateItemDto[] }) {
    if (!dto.items.length) throw new BadRequestException('Minimálně 1 položka')

    const account = await this.prisma.bankAccount.findFirst({ where: { id: dto.bankAccountId, tenantId: user.tenantId } })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')

    return this.prisma.paymentOrder.create({
      data: {
        tenantId: user.tenantId,
        bankAccountId: dto.bankAccountId,
        financialContextId: dto.financialContextId,
        createdById: user.id,
        note: dto.note,
        items: {
          create: dto.items.map(i => ({
            counterpartyName: i.counterpartyName,
            counterpartyAccount: i.counterpartyAccount,
            counterpartyBankCode: i.counterpartyBankCode,
            amount: new Decimal(i.amount),
            variableSymbol: i.variableSymbol,
            specificSymbol: i.specificSymbol,
            constantSymbol: i.constantSymbol,
            description: i.description,
            invoiceId: i.invoiceId,
            prescriptionId: i.prescriptionId,
          })),
        },
      },
      include: { items: true, bankAccount: { select: { name: true, accountNumber: true } } },
    })
  }

  async cancel(user: AuthUser, id: string) {
    const order = await this.prisma.paymentOrder.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!order) throw new NotFoundException('Příkaz nenalezen')
    if (order.status === 'exported') throw new BadRequestException('Exportovaný příkaz k úhradě nelze zrušit.')
    await this.prisma.paymentOrder.update({ where: { id }, data: { status: 'cancelled' } })
  }

  async exportOrder(user: AuthUser, id: string, format: 'pdf' | 'abo'): Promise<Buffer> {
    const order = await this.getDetail(user, id)
    if (order.status === 'cancelled') throw new BadRequestException('Zrušený příkaz k úhradě nelze exportovat.')
    await this.prisma.paymentOrder.update({ where: { id }, data: { status: 'exported', exportFormat: format, exportedAt: new Date() } })
    return format === 'pdf' ? this.buildPdf(order) : this.buildAbo(order)
  }

  // ─── PDF ──────────────────────────────────────────────────

  private buildPdf(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageW = 595.28 - 100
      const fmtK = (n: number) => new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' Kč'
      const fmtD = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
      let y = 50

      doc.font('Helvetica-Bold').fontSize(14).text('Příkaz k úhradě', 50, y)
      y += 20
      doc.font('Helvetica').fontSize(9)
      doc.text(`Účet: ${order.bankAccount.name} (${order.bankAccount.accountNumber})`, 50, y)
      doc.text(`Datum: ${fmtD(new Date(order.createdAt))}`, 350, y)
      y += 16
      doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
      y += 10

      // Table header
      const cols = [100, 100, 60, 40, 40, 80]
      const colX = cols.reduce((a: number[], w, i) => { a.push(i === 0 ? 50 : a[i - 1] + cols[i - 1]); return a }, [] as number[])
      const headers = ['Příjemce', 'Účet/Banka', 'VS', 'KS', 'SS', 'Částka']

      doc.font('Helvetica-Bold').fontSize(8)
      headers.forEach((h, i) => doc.text(h, colX[i], y, { width: cols[i], align: i === 5 ? 'right' : 'left' }))
      y += 12
      doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#eee')
      y += 3

      doc.font('Helvetica').fontSize(8)
      let total = 0
      for (const item of order.items) {
        if (y > 730) { doc.addPage(); y = 50 }
        total += item.amount
        doc.text((item.counterpartyName ?? '').slice(0, 18), colX[0], y, { width: cols[0] })
        doc.text(`${item.counterpartyAccount}/${item.counterpartyBankCode}`, colX[1], y, { width: cols[1] })
        doc.text(item.variableSymbol ?? '', colX[2], y, { width: cols[2] })
        doc.text(item.constantSymbol ?? '', colX[3], y, { width: cols[3] })
        doc.text(item.specificSymbol ?? '', colX[4], y, { width: cols[4] })
        doc.text(fmtK(item.amount), colX[5], y, { width: cols[5], align: 'right' })
        y += 11
      }

      y += 4
      doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#333')
      y += 6
      doc.font('Helvetica-Bold').fontSize(9)
      doc.text('Celkem', 50, y)
      doc.text(fmtK(total), colX[5], y, { width: cols[5], align: 'right' })

      // Footer
      const tp = doc.bufferedPageRange().count
      for (let i = 0; i < tp; i++) {
        doc.switchToPage(i)
        doc.font('Helvetica').fontSize(7).fillColor('#999')
        doc.moveTo(50, 780).lineTo(50 + pageW, 780).stroke('#ddd')
        doc.text(`Vygenerováno ifmio • ${fmtD(new Date())}   Strana ${i + 1} z ${tp}`, 50, 784)
        doc.fillColor('#000')
      }

      doc.end()
    })
  }

  // ─── ABO ──────────────────────────────────────────────────

  private buildAbo(order: any): Promise<Buffer> {
    const pad = (s: string, len: number) => (s ?? '').padEnd(len).slice(0, len)
    const padNum = (n: number | string, len: number) => String(n).padStart(len, '0').slice(-len)
    const now = new Date()
    const ddmmyy = padNum(now.getDate(), 2) + padNum(now.getMonth() + 1, 2) + padNum(now.getFullYear() % 100, 2)
    const ourAccount = (order.bankAccount.accountNumber ?? '').replace(/[^0-9]/g, '')

    const lines: string[] = []

    // UHL1 header: type 074
    const header = '074' + padNum(ourAccount, 16) + pad('', 20) + ddmmyy + pad('', 83)
    lines.push(header.padEnd(128).slice(0, 128))

    for (const item of order.items) {
      const counterAccount = (item.counterpartyAccount ?? '').replace(/[^0-9]/g, '')
      const amountHalere = Math.round(item.amount * 100)
      const line =
        '075' +
        padNum(ourAccount, 16) +
        padNum(counterAccount, 16) +
        padNum('0', 13) + // transaction number
        padNum(amountHalere, 12) +
        '1' + // 1 = debit (outgoing payment)
        padNum((item.variableSymbol ?? '').replace(/[^0-9]/g, ''), 10) +
        padNum((item.counterpartyBankCode ?? '').replace(/[^0-9]/g, ''), 4) +
        padNum((item.constantSymbol ?? '').replace(/[^0-9]/g, ''), 10) +
        padNum((item.specificSymbol ?? '').replace(/[^0-9]/g, ''), 6) +
        ddmmyy +
        pad(item.counterpartyName ?? '', 20)
      lines.push(line.padEnd(128).slice(0, 128))
    }

    // UKO1 footer: type 076
    const totalHalere = order.items.reduce((s: number, i: any) => s + Math.round(i.amount * 100), 0)
    const footer = '076' + padNum(ourAccount, 16) + padNum(order.items.length, 6) + padNum(totalHalere, 12) + pad('', 91)
    lines.push(footer.padEnd(128).slice(0, 128))

    return Promise.resolve(Buffer.from(lines.join('\r\n'), 'ascii'))
  }
}
