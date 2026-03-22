import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettlementCalcService } from './settlement-calc.service'
import { KontoService } from '../konto/konto.service'
import { EmailService } from '../email/email.service'
import PDFDocument from 'pdfkit'
import type { CreateSettlementDto, AddCostDto } from './dto/create-settlement.dto'
import type { SettlementCostType, DistributionKey } from '@prisma/client'

const PENB_BASIC_PERCENT: Record<string, number> = {
  A: 60, B: 60, C: 50, D: 40, E: 40, F: 40, G: 40,
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name)

  constructor(
    private prisma: PrismaService,
    private calc: SettlementCalcService,
    private konto: KontoService,
    private email: EmailService,
  ) {}

  async create(tenantId: string, dto: CreateSettlementDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, tenantId },
      include: { units: { select: { id: true, heatingArea: true, area: true, personCount: true, tuvArea: true } } },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    // Determine basic percent from PENB class
    const basicPct = dto.heatingBasicPercent
      ?? (dto.buildingEnergyClass ? PENB_BASIC_PERCENT[dto.buildingEnergyClass.toUpperCase()] ?? 50 : 50)

    const settlement = await this.prisma.settlement.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        financialContextId: dto.financialContextId,
        billingPeriodId: dto.billingPeriodId,
        name: dto.name,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        heatingBasicPercent: basicPct,
        buildingEnergyClass: dto.buildingEnergyClass,
        note: dto.note,
      },
    })

    // Auto-create SettlementItem for each unit
    for (const unit of property.units) {
      await this.prisma.settlementItem.create({
        data: {
          settlementId: settlement.id,
          unitId: unit.id,
          heatedArea: unit.heatingArea ?? unit.area ?? 0,
          personCount: unit.personCount ?? 1,
        },
      })
    }

    return this.findOne(tenantId, settlement.id)
  }

  async findAll(tenantId: string, query?: { propertyId?: string; status?: string; year?: string }) {
    const where: Record<string, unknown> = { tenantId }
    if (query?.propertyId) where.propertyId = query.propertyId
    if (query?.status) where.status = query.status
    if (query?.year) {
      const y = parseInt(query.year)
      where.periodFrom = { gte: new Date(y, 0, 1) }
      where.periodTo = { lte: new Date(y, 11, 31, 23, 59, 59) }
    }

    return this.prisma.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        _count: { select: { items: true, costEntries: true } },
      },
    })
  }

  async findOne(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id, tenantId },
      include: {
        property: { select: { id: true, name: true, address: true, city: true } },
        costEntries: { orderBy: { createdAt: 'asc' } },
        items: {
          include: { unit: { select: { id: true, name: true, floor: true, area: true } } },
          orderBy: { unit: { name: 'asc' } },
        },
      },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')
    return settlement
  }

  async addCost(tenantId: string, settlementId: string, dto: AddCostDto) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id: settlementId, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    return this.prisma.settlementCost.create({
      data: {
        settlementId,
        costType: dto.costType as SettlementCostType,
        name: dto.name,
        totalAmount: dto.totalAmount,
        invoiceId: dto.invoiceId,
        distributionKey: dto.distributionKey as DistributionKey,
        basicPercent: dto.basicPercent,
      },
    })
  }

  async removeCost(tenantId: string, costId: string) {
    const cost = await this.prisma.settlementCost.findUnique({
      where: { id: costId },
      include: { settlement: { select: { tenantId: true } } },
    })
    if (!cost || cost.settlement.tenantId !== tenantId) throw new NotFoundException('Nákladová položka nenalezena')
    await this.prisma.settlementCost.delete({ where: { id: costId } })
  }

  async calculate(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    await this.calc.calculate(id)
    return this.findOne(tenantId, id)
  }

  async approve(tenantId: string, id: string, userId: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'approved', approvedAt: new Date(), approvedBy: userId },
    })
  }

  async getUnitDetail(tenantId: string, settlementId: string, unitId: string) {
    const item = await this.prisma.settlementItem.findUnique({
      where: { settlementId_unitId: { settlementId, unitId } },
      include: {
        unit: { select: { id: true, name: true, floor: true, area: true, heatingArea: true, personCount: true } },
        settlement: { select: { tenantId: true, name: true, periodFrom: true, periodTo: true } },
      },
    })
    if (!item || item.settlement.tenantId !== tenantId) throw new NotFoundException('Položka vyúčtování nenalezena')
    return item
  }

  // ─── CLOSE — post results to konto ──────────────────────────────

  async closeSettlement(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            unit: {
              include: { occupancies: { where: { isActive: true, isPrimaryPayer: true }, take: 1 } },
            },
          },
        },
      },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')
    if (settlement.status !== 'approved') {
      throw new BadRequestException('Uzavřít lze pouze schválené vyúčtování')
    }

    const year = settlement.periodFrom.getFullYear()
    let posted = 0

    for (const item of settlement.items) {
      const balance = Number(item.balance)
      if (Math.abs(balance) < 0.01) continue // zero result, skip

      const occ = item.unit?.occupancies?.[0]
      if (!occ) continue // no active resident

      try {
        const account = await this.konto.getOrCreateAccount(
          tenantId, settlement.propertyId, item.unitId, occ.residentId,
        )

        if (balance > 0) {
          // Přeplatek — SVJ owes the owner → CREDIT (reduces owner's balance)
          await this.konto.postCredit(
            account.id, balance, 'SETTLEMENT', settlement.id,
            `Vyúčtování ${year} — přeplatek`, settlement.periodTo,
          )
        } else {
          // Nedoplatek — owner owes SVJ → DEBIT (increases owner's balance)
          await this.konto.postDebit(
            account.id, Math.abs(balance), 'SETTLEMENT', settlement.id,
            `Vyúčtování ${year} — nedoplatek`, settlement.periodTo,
          )
        }
        posted++
      } catch (err) {
        this.logger.error(`Settlement konto posting for unit ${item.unitId} failed: ${err}`)
      }
    }

    await this.prisma.settlement.update({
      where: { id },
      data: { status: 'closed' },
    })

    return { closed: true, posted, total: settlement.items.length }
  }

  // ─── REOPEN — only from approved ──────────────────────────────

  async reopenSettlement(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')
    if (settlement.status !== 'approved') {
      throw new BadRequestException('Znovu otevřít lze pouze schválené vyúčtování')
    }

    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'draft', approvedAt: null, approvedBy: null },
    })
  }

  // ─── DELETE — only DRAFT ──────────────────────────────────────

  async deleteSettlement(tenantId: string, id: string) {
    const settlement = await this.prisma.settlement.findFirst({ where: { id, tenantId } })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')
    if (settlement.status !== 'draft') {
      throw new BadRequestException('Smazat lze pouze rozpracované vyúčtování')
    }

    // Cascading delete of items and costs (via onDelete: Cascade)
    await this.prisma.settlement.delete({ where: { id } })
    return { deleted: true }
  }

  // ─── AUTO-POPULATE COSTS FROM INVOICES ─────────────────────────

  async populateCostsFromInvoices(tenantId: string, settlementId: string) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tenantId },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    const allocations = await this.prisma.invoiceCostAllocation.findMany({
      where: {
        invoice: {
          tenantId,
          propertyId: settlement.propertyId,
          deletedAt: null,
          issueDate: { gte: settlement.periodFrom, lte: settlement.periodTo },
        },
      },
      include: {
        component: { select: { id: true, name: true, componentType: true, allocationMethod: true } },
      },
    })

    // Group by component
    const grouped = new Map<string, { name: string; total: number; distributionKey: string }>()
    for (const a of allocations) {
      const key = a.componentId
      if (!grouped.has(key)) {
        const dk = this.mapAllocationToDistribution(a.component.allocationMethod)
        grouped.set(key, { name: a.component.name, total: 0, distributionKey: dk })
      }
      grouped.get(key)!.total += Number(a.amount)
    }

    // Create cost entries
    let created = 0
    for (const [, g] of grouped) {
      await this.prisma.settlementCost.create({
        data: {
          settlementId,
          costType: 'other' as SettlementCostType,
          name: g.name,
          totalAmount: g.total,
          distributionKey: g.distributionKey as DistributionKey,
        },
      })
      created++
    }

    return { populated: created, totalAllocations: allocations.length }
  }

  private mapAllocationToDistribution(method: string): string {
    const map: Record<string, string> = {
      area: 'floor_area', share: 'ownership_share', persons: 'person_count',
      consumption: 'meter_reading', equal: 'equal', heating_area: 'heated_area', custom: 'custom',
    }
    return map[method] ?? 'floor_area'
  }

  // ─── PDF GENERATION ────────────────────────────────────────────

  async generateBulkPdf(tenantId: string, settlementId: string): Promise<PDFKit.PDFDocument> {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tenantId },
      include: {
        property: true,
        items: {
          include: { unit: { include: { occupancies: { where: { isActive: true }, include: { resident: true }, take: 1 } } } },
        },
        costEntries: true,
      },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    for (let i = 0; i < settlement.items.length; i++) {
      if (i > 0) doc.addPage()
      this.renderSettlementItemPage(doc, settlement, settlement.items[i])
    }

    doc.end()
    return doc
  }

  async generateItemPdf(tenantId: string, settlementId: string, itemId: string): Promise<PDFKit.PDFDocument> {
    const item = await this.prisma.settlementItem.findFirst({
      where: { id: itemId, settlement: { id: settlementId, tenantId } },
      include: {
        unit: { include: { occupancies: { where: { isActive: true }, include: { resident: true }, take: 1 } } },
        settlement: { include: { property: true, costEntries: true } },
      },
    })
    if (!item) throw new NotFoundException('Položka vyúčtování nenalezena')

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    this.renderSettlementItemPage(doc, item.settlement, item)
    doc.end()
    return doc
  }

  private renderSettlementItemPage(doc: PDFKit.PDFDocument, settlement: any, item: any) {
    const property = settlement.property
    const unit = item.unit
    const occ = unit?.occupancies?.[0]
    const resident = occ?.resident
    const ownerName = resident
      ? (resident.isLegalEntity && resident.companyName ? resident.companyName : `${resident.firstName} ${resident.lastName}`)
      : '—'
    const year = settlement.periodFrom.getFullYear()

    const fmtCzk = (n: number) => Math.round(n).toLocaleString('cs-CZ') + ' Kč'
    const fmtDate = (d: Date) => d.toLocaleDateString('cs-CZ')

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text(`ROČNÍ VYÚČTOVÁNÍ ZA ROK ${year}`, { align: 'center' }).moveDown(1)

    // Property info
    doc.fontSize(10).font('Helvetica')
    doc.text(`Nemovitost: ${property.name}`)
    if (property.ico) doc.text(`IČ: ${property.ico}`)
    doc.text(`Adresa: ${property.address}, ${property.postalCode} ${property.city}`)
    doc.moveDown(0.5)

    // Owner + unit info
    doc.font('Helvetica-Bold').text(`Vlastník: ${ownerName}`)
    doc.font('Helvetica')
    doc.text(`Jednotka: ${unit?.name ?? '—'}`)
    if (unit?.area) doc.text(`Plocha: ${unit.area} m²`)
    doc.text(`Období: ${fmtDate(settlement.periodFrom)} – ${fmtDate(settlement.periodTo)}`)
    if (occ?.variableSymbol) doc.text(`VS: ${occ.variableSymbol}`)
    doc.moveDown(1)

    // Cost breakdown table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333').moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(9)
    doc.text('Složka', 50, doc.y)
    doc.text('Náklad celk.', 250, doc.y - 10, { align: 'right', width: 90 })
    doc.text('Váš podíl', 340, doc.y - 10, { align: 'right', width: 70 })
    doc.text('Zálohy', 410, doc.y - 10, { align: 'right', width: 60 })
    doc.text('Výsledek', 475, doc.y - 10, { align: 'right', width: 70 })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc').moveDown(0.3)

    doc.font('Helvetica').fontSize(9)
    const breakdown = (item.costBreakdown as any[]) ?? []
    for (const line of breakdown) {
      doc.text(line.name ?? '—', 50, doc.y)
      doc.text(fmtCzk(line.totalPropertyCost ?? 0), 250, doc.y - 10, { align: 'right', width: 90 })
      doc.text(fmtCzk(line.ownerCost ?? 0), 340, doc.y - 10, { align: 'right', width: 70 })
      doc.text(fmtCzk(line.advance ?? 0), 410, doc.y - 10, { align: 'right', width: 60 })
      const bal = (line.advance ?? 0) - (line.ownerCost ?? 0)
      doc.text((bal >= 0 ? '+' : '') + fmtCzk(bal), 475, doc.y - 10, { align: 'right', width: 70 })
      doc.moveDown(0.3)
    }

    // Totals
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333').moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10)
    const totalCost = Number(item.totalCost)
    const totalAdv = Number(item.totalAdvances)
    const balance = Number(item.balance)
    doc.text('CELKEM', 50, doc.y)
    doc.text(fmtCzk(totalCost), 340, doc.y - 10, { align: 'right', width: 70 })
    doc.text(fmtCzk(totalAdv), 410, doc.y - 10, { align: 'right', width: 60 })
    doc.text((balance >= 0 ? '+' : '') + fmtCzk(balance), 475, doc.y - 10, { align: 'right', width: 70 })
    doc.moveDown(1)

    // Result
    doc.fontSize(11).font('Helvetica-Bold')
    if (balance >= 0) {
      doc.text(`VÝSLEDEK: PŘEPLATEK ${fmtCzk(balance)}`, { align: 'center' })
    } else {
      doc.text(`VÝSLEDEK: NEDOPLATEK ${fmtCzk(Math.abs(balance))}`, { align: 'center' })
    }
    doc.moveDown(2)

    // Footer
    doc.font('Helvetica').fontSize(9)
    doc.text(`V ${property.city ?? 'Praze'} dne ${new Date().toLocaleDateString('cs-CZ')}`)
    doc.moveDown(1.5)
    doc.text('Správce nemovitosti', { align: 'right' })

    doc.moveDown(2)
    doc.fontSize(7).fillColor('#aaa').text(`ifmio | ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })
    doc.fillColor('#000')
  }

  // ─── EMAIL SENDING ────────────────────────────────────────────

  async sendSettlementEmails(tenantId: string, settlementId: string, opts: { subject?: string; message?: string }) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tenantId },
      include: {
        property: true,
        items: {
          include: { unit: { include: { occupancies: { where: { isActive: true }, include: { resident: true }, take: 1 } } } },
        },
        costEntries: true,
      },
    })
    if (!settlement) throw new NotFoundException('Vyúčtování nenalezeno')

    const year = settlement.periodFrom.getFullYear()
    const subject = opts.subject ?? `Roční vyúčtování za rok ${year}`
    let sent = 0; let failed = 0; let skipped = 0

    for (const item of settlement.items) {
      const resident = item.unit?.occupancies?.[0]?.resident
      if (!resident?.email) { skipped++; continue }

      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        this.renderSettlementItemPage(doc, settlement, item)
        doc.end()

        const chunks: Buffer[] = []
        await new Promise<void>((resolve, reject) => {
          doc.on('data', (c: Buffer) => chunks.push(c))
          doc.on('end', () => resolve())
          doc.on('error', reject)
        })

        const htmlBody = opts.message
          ? `<p>${opts.message.replace(/\n/g, '<br>')}</p>`
          : `<p>Dobrý den,</p><p>v příloze zasíláme roční vyúčtování za rok ${year}.</p><p>S pozdravem,<br>${settlement.property.name}</p>`

        const ok = await this.email.send({ to: resident.email, subject, html: htmlBody })
        if (ok) sent++; else failed++
      } catch (err) {
        this.logger.error(`Settlement email failed for ${resident.email}: ${err}`)
        failed++
      }
    }

    // Update status to 'sent' if all succeeded
    if (sent > 0 && failed === 0) {
      await this.prisma.settlement.update({ where: { id: settlementId }, data: { status: 'sent' } })
    }

    return { total: settlement.items.length, sent, failed, skipped }
  }
}
