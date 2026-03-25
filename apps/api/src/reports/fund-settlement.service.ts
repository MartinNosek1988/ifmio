import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import PDFDocument from 'pdfkit'
import type { AuthUser } from '@ifmio/shared-types'

// ─── Types ──────────────────────────────────────────────────────

interface VydajRow {
  datum: Date
  zdroj: string
  nazev: string
  vs: string
  castka: number
}

interface OwnerSettlement {
  vlastnikJmeno: string
  podilCitatel: number
  podilJmenovatel: number
  jednotka: string
  typJednotky: string
  predepsanoDo: number
  vydajePerVlastnik: number
  podilNaZustatku: number
  prazdnaStranka: boolean
}

interface FundSettlementData {
  property: { name: string; ico: string | null; address: string }
  spravce: { firma: string; adresa: string; ic: string; dic: string; jmeno: string; email: string; telefon: string }
  componentName: string
  year: number
  stavFonduOd: number
  prijmyPredpisy: number
  prijmyOstatni: number
  vydajeTotal: number
  stavFonduDo: number
  vydaje: VydajRow[]
  owners: OwnerSettlement[]
  vytiskl: string
}

// ─── Helper ─────────────────────────────────────────────────────

function fmtCzk(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' Kč'
}

function fmtDate(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

// ─── Service ────────────────────────────────────────────────────

@Injectable()
export class FundSettlementService {
  constructor(private prisma: PrismaService) {}

  async generateData(user: AuthUser, params: {
    propertyId: string; componentId: string; year: number; unitIds?: string[]
  }): Promise<FundSettlementData> {
    const { propertyId, componentId, year } = params
    const tenantId = user.tenantId
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
    const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999)

    // KROK 1: Load component
    const component = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId, tenantId, propertyId },
    })
    if (!component) throw new NotFoundException('Složka předpisu nenalezena')
    if (component.componentType !== 'FUND') throw new BadRequestException('Složka není typu Fond')

    // Load property
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    // Load tenant settings for správce info
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } })
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })

    const spravce = {
      firma: settings?.orgName ?? tenant?.name ?? '',
      adresa: [settings?.orgStreet, settings?.orgCity, settings?.orgZip].filter(Boolean).join(', '),
      ic: tenant?.ico ?? settings?.companyNumber ?? '',
      dic: tenant?.dic ?? settings?.vatNumber ?? '',
      jmeno: user.name ?? '',
      email: settings?.orgEmail ?? '',
      telefon: settings?.orgPhone ?? '',
    }

    // KROK 2: Fund summary
    const stavFonduOd = await this.calcBalance(componentId, prevYearEnd)
    const stavFonduDo = await this.calcBalance(componentId, yearEnd)

    const incomeAgg = await this.prisma.prescriptionItem.aggregate({
      where: { componentId, prescription: { validFrom: { gte: yearStart, lte: yearEnd } } },
      _sum: { amount: true },
    })
    const prijmyPredpisy = incomeAgg._sum.amount ? Number(incomeAgg._sum.amount) : 0

    const expenseAgg = await this.prisma.invoiceCostAllocation.aggregate({
      where: { componentId, invoice: { issueDate: { gte: yearStart, lte: yearEnd } } },
      _sum: { amount: true },
    })
    const vydajeTotal = expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0

    // KROK 3: Expense rows
    const allocations = await this.prisma.invoiceCostAllocation.findMany({
      where: { componentId, invoice: { issueDate: { gte: yearStart, lte: yearEnd } } },
      include: {
        invoice: { select: { issueDate: true, description: true, variableSymbol: true, number: true, transactionId: true } },
      },
      orderBy: { invoice: { issueDate: 'asc' } },
    })

    const vydaje: VydajRow[] = allocations.map(a => ({
      datum: a.invoice.issueDate,
      zdroj: a.invoice.transactionId ? 'Banka' : 'Doklad',
      nazev: a.invoice.description ?? a.invoice.number ?? '',
      vs: a.invoice.variableSymbol ?? '',
      castka: -Math.abs(Number(a.amount)),
    }))

    // KROK 4: Per-owner data — batch load to avoid N+1
    const assignments = await this.prisma.componentAssignment.findMany({
      where: {
        componentId,
        isActive: true,
        ...(params.unitIds?.length ? { unitId: { in: params.unitIds } } : {}),
      },
      select: { unitId: true },
    })
    const unitIds = [...new Set(assignments.map(a => a.unitId))]

    // Batch: units, ownerships, prescription incomes
    const [units, ownerships, prescriptionItems] = await Promise.all([
      this.prisma.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, name: true, spaceType: true, commonAreaShare: true },
      }),
      this.prisma.unitOwnership.findMany({
        where: { unitId: { in: unitIds }, isActive: true, tenantId },
        include: { party: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescriptionItem.findMany({
        where: {
          componentId,
          prescription: { unitId: { in: unitIds }, validFrom: { gte: yearStart, lte: yearEnd } },
        },
        select: { amount: true, prescription: { select: { unitId: true } } },
      }),
    ])

    // Build lookup maps
    const unitMap = new Map(units.map(u => [u.id, u]))
    const ownerMap = new Map<string, typeof ownerships[0]>()
    for (const o of ownerships) {
      if (!ownerMap.has(o.unitId)) ownerMap.set(o.unitId, o) // first = most recent (orderBy desc)
    }
    const incomeMap = new Map<string, number>()
    for (const pi of prescriptionItems) {
      const uid = pi.prescription.unitId
      if (uid) incomeMap.set(uid, (incomeMap.get(uid) ?? 0) + Number(pi.amount))
    }

    const owners: OwnerSettlement[] = []

    for (const unitId of unitIds) {
      const unit = unitMap.get(unitId)
      if (!unit) continue

      const ownership = ownerMap.get(unitId)
      const vlastnikJmeno = ownership?.party.displayName ?? 'Neznámý vlastník'

      let citatel = ownership?.shareNumerator ?? 0
      let jmenovatel = ownership?.shareDenominator ?? 1
      if (citatel === 0 && unit.commonAreaShare) {
        const share = Number(unit.commonAreaShare)
        citatel = Math.round(share * 10000)
        jmenovatel = 10000
      }
      if (jmenovatel === 0) jmenovatel = 1

      const predepsanoDo = incomeMap.get(unitId) ?? 0
      const podil = jmenovatel > 0 ? citatel / jmenovatel : 0
      const vydajePerVlastnik = new Decimal(vydajeTotal).mul(new Decimal(podil)).toDecimalPlaces(2).toNumber()
      const podilNaZustatku = new Decimal(stavFonduDo).mul(new Decimal(podil)).toDecimalPlaces(2).toNumber()

      const typJednotky = unit.spaceType === 'RESIDENTIAL' ? 'bytový' :
        unit.spaceType === 'NON_RESIDENTIAL' ? 'nebytový' : (unit.spaceType ?? 'jiný').toLowerCase()

      owners.push({
        vlastnikJmeno,
        podilCitatel: citatel,
        podilJmenovatel: jmenovatel,
        jednotka: unit.name,
        typJednotky,
        predepsanoDo,
        vydajePerVlastnik: -Math.abs(vydajePerVlastnik),
        podilNaZustatku,
        prazdnaStranka: predepsanoDo === 0 && vydajeTotal === 0,
      })
    }

    return {
      property: {
        name: property.name,
        ico: property.ico,
        address: `${property.address}, ${property.city} ${property.postalCode}`,
      },
      spravce,
      componentName: component.name,
      year,
      stavFonduOd,
      prijmyPredpisy,
      prijmyOstatni: 0,
      vydajeTotal,
      stavFonduDo,
      vydaje,
      owners,
      vytiskl: user.name ?? 'Neznámý uživatel',
    }
  }

  // ─── Balance calculation ────────────────────────────────────

  private async calcBalance(componentId: string, asOfDate: Date): Promise<number> {
    const component = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId },
      select: { initialBalance: true },
    })
    const initial = component?.initialBalance ? Number(component.initialBalance) : 0

    const incomeAgg = await this.prisma.prescriptionItem.aggregate({
      where: { componentId, prescription: { validFrom: { lte: asOfDate } } },
      _sum: { amount: true },
    })
    const income = incomeAgg._sum.amount ? Number(incomeAgg._sum.amount) : 0

    const expenseAgg = await this.prisma.invoiceCostAllocation.aggregate({
      where: { componentId, invoice: { issueDate: { lte: asOfDate } } },
      _sum: { amount: true },
    })
    const expenses = expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0

    return initial + income - expenses
  }

  // ─── PDF Generation ─────────────────────────────────────────

  async generatePdf(data: FundSettlementData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { year, spravce, property } = data
      const dateFrom = `1.1.${year}`
      const dateTo = `31.12.${year}`
      const pageW = 595.28 - 100 // A4 width minus margins

      // Generate one page per owner
      for (let i = 0; i < data.owners.length; i++) {
        if (i > 0) doc.addPage()
        const owner = data.owners[i]
        this.renderPage(doc, data, owner, pageW, dateFrom, dateTo)
      }

      if (data.owners.length === 0) {
        this.renderHeader(doc, spravce, property, year, pageW, dateFrom, dateTo)
        doc.font('Helvetica-Oblique').fontSize(10).text('Žádné záznamy nebyly nalezeny', 50, 300)
      }

      // Footer on all pages
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        const y = 780
        doc.font('Helvetica').fontSize(8)
        doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
        doc.text(`Vytiskl: ${data.vytiskl}`, 50, y + 4, { continued: true })
        doc.text(`   Strana ${i + 1} z ${totalPages}`, { continued: true })
        doc.text(`   Dne: ${fmtDate(new Date())}`)
      }

      doc.end()
    })
  }

  private renderHeader(
    doc: PDFKit.PDFDocument,
    spravce: FundSettlementData['spravce'],
    property: FundSettlementData['property'],
    year: number,
    pageW: number,
    dateFrom: string,
    dateTo: string,
  ) {
    let y = 50

    // Správce info
    doc.font('Helvetica').fontSize(9)
    doc.text(`${spravce.firma}, ${spravce.adresa}`, 50, y)
    doc.text(`IČ: ${spravce.ic}, DIČ: ${spravce.dic}`, 50, y + 12)
    doc.text(`Správce: ${spravce.jmeno}, e-mail: ${spravce.email}`, 50, y + 24)
    y += 40

    // Line
    doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#999')
    y += 12

    // Title (bordered)
    doc.font('Helvetica-Bold').fontSize(12)
    const titleText = `Vyúčtování fondu ${dateFrom} - ${dateTo}`
    doc.rect(50, y, pageW, 24).stroke('#333')
    doc.text(titleText, 55, y + 6, { width: pageW - 10 })
    y += 30

    // SVJ info
    doc.font('Helvetica').fontSize(10)
    doc.text(`${property.name}${property.ico ? `, IČ: ${property.ico}` : ''}`, 50, y)
    doc.text(property.address, 50, y + 14)
    y += 32

    return y
  }

  private renderPage(
    doc: PDFKit.PDFDocument,
    data: FundSettlementData,
    owner: OwnerSettlement,
    pageW: number,
    dateFrom: string,
    dateTo: string,
  ) {
    let y = this.renderHeader(doc, data.spravce, data.property, data.year, pageW, dateFrom, dateTo)

    if (owner.prazdnaStranka) {
      doc.font('Helvetica-Oblique').fontSize(10).text('Žádné záznamy nebyly nalezeny', 50, y + 20)
      return
    }

    // Component + owner block
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text(data.componentName, 50, y)
    y += 14
    doc.text(owner.vlastnikJmeno, 50, y)
    y += 14
    doc.font('Helvetica').fontSize(9)
    doc.text(`Podíl na spol. částech domu: ${owner.podilCitatel} / ${owner.podilJmenovatel}`, 50, y)
    y += 18

    // Souhrnný přehled
    doc.font('Helvetica-Bold').fontSize(9)
    doc.text(`Souhrnný přehled ${dateFrom} - ${dateTo} (celá nemovitost)`, 50, y)
    y += 14

    const summaryRows = [
      ['Stav fondu', `k 1.1.${data.year}`, fmtCzk(data.stavFonduOd)],
      ['Příjmy - předpisy plateb', `${dateFrom} - ${dateTo}`, fmtCzk(data.prijmyPredpisy)],
      ['Příjmy - ostatní', `${dateFrom} - ${dateTo}`, fmtCzk(data.prijmyOstatni)],
      ['Výdaje z fondu', `${dateFrom} - ${dateTo}`, fmtCzk(-data.vydajeTotal)],
      ['Stav fondu', `k 31.12.${data.year}`, fmtCzk(data.stavFonduDo)],
    ]
    doc.font('Helvetica').fontSize(9)
    for (const [label, period, amount] of summaryRows) {
      doc.text(label, 50, y, { width: 180 })
      doc.text(period, 230, y, { width: 150 })
      doc.text(amount, 380, y, { width: 110, align: 'right' })
      y += 13
    }
    y += 8

    // Tabulka výdajů
    doc.font('Helvetica-Bold').fontSize(9)
    doc.text(`Výdaje z fondu ${dateFrom} - ${dateTo}`, 50, y)
    y += 14

    // Column widths: Datum(60) Zdroj(45) Název(195) VS(70) Částka(75) ČástkaVlastník(80)
    const cols = [60, 45, 195, 70, 75, 80]
    const colX = cols.reduce((acc: number[], w, i) => { acc.push(i === 0 ? 50 : acc[i - 1] + cols[i - 1]); return acc }, [] as number[])

    // Header
    const headers = ['Datum', 'Zdroj', 'Název', 'VS', 'Částka', 'Za vlastníka']
    doc.font('Helvetica-Bold').fontSize(8)
    headers.forEach((h, i) => {
      doc.text(h, colX[i], y, { width: cols[i], align: i >= 4 ? 'right' : 'left' })
    })
    y += 11
    doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
    y += 4

    // Rows
    doc.font('Helvetica').fontSize(8)
    const podil = owner.podilJmenovatel > 0 ? owner.podilCitatel / owner.podilJmenovatel : 0
    let sumaVydaje = 0
    let sumaVlastnik = 0

    for (const v of data.vydaje) {
      if (y > 720) {
        doc.addPage()
        y = 50
      }
      const castkaVlastnik = new Decimal(v.castka).mul(new Decimal(podil)).toDecimalPlaces(2).toNumber()
      sumaVydaje += v.castka
      sumaVlastnik += castkaVlastnik

      doc.text(fmtDate(v.datum), colX[0], y, { width: cols[0] })
      doc.text(v.zdroj, colX[1], y, { width: cols[1] })
      const nazev = v.nazev.length > 40 ? v.nazev.slice(0, 40) + '...' : v.nazev
      doc.text(nazev, colX[2], y, { width: cols[2] })
      doc.text(v.vs, colX[3], y, { width: cols[3] })
      doc.text(fmtCzk(v.castka), colX[4], y, { width: cols[4], align: 'right' })
      doc.text(fmtCzk(castkaVlastnik), colX[5], y, { width: cols[5], align: 'right' })
      y += 11
    }

    // Totals row
    y += 2
    doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
    y += 4
    doc.font('Helvetica-Bold').fontSize(8)
    doc.text('Celkem', colX[0], y, { width: cols[0] })
    doc.text(fmtCzk(sumaVydaje), colX[4], y, { width: cols[4], align: 'right' })
    doc.text(fmtCzk(sumaVlastnik), colX[5], y, { width: cols[5], align: 'right' })
    y += 18

    // Per-unit table
    if (y > 700) { doc.addPage(); y = 50 }
    doc.font('Helvetica-Bold').fontSize(8)
    const unitCols = [55, 70, 55, 90, 90, 110]
    const unitColX = unitCols.reduce((acc: number[], w, i) => { acc.push(i === 0 ? 50 : acc[i - 1] + unitCols[i - 1]); return acc }, [] as number[])
    const unitHeaders = ['Jednotka', 'Typ', 'Podíl', 'Příjmy', 'Výdaje', 'Zůstatek fondu']
    unitHeaders.forEach((h, i) => {
      doc.text(h, unitColX[i], y, { width: unitCols[i], align: i >= 3 ? 'right' : 'left' })
    })
    y += 11
    doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
    y += 4

    doc.font('Helvetica').fontSize(8)
    doc.text(owner.jednotka, unitColX[0], y, { width: unitCols[0] })
    doc.text(owner.typJednotky, unitColX[1], y, { width: unitCols[1] })
    doc.text(String(owner.podilCitatel), unitColX[2], y, { width: unitCols[2] })
    doc.text(fmtCzk(0), unitColX[3], y, { width: unitCols[3], align: 'right' })
    doc.text(fmtCzk(owner.vydajePerVlastnik), unitColX[4], y, { width: unitCols[4], align: 'right' })
    doc.text(fmtCzk(owner.podilNaZustatku), unitColX[5], y, { width: unitCols[5], align: 'right' })
    y += 20

    // Summary
    if (y > 720) { doc.addPage(); y = 50 }
    doc.font('Helvetica').fontSize(9)
    doc.text(`Předepsáno do fondu ${dateFrom} - ${dateTo} (na vlastníka)`, 50, y, { width: 350 })
    doc.text(fmtCzk(owner.predepsanoDo), 400, y, { width: 110, align: 'right' })
    y += 14
    doc.font('Helvetica-Bold')
    doc.text(`Výdaje ${dateFrom} - ${dateTo} (na podíl vlastníka)`, 50, y, { width: 350 })
    doc.text(fmtCzk(owner.vydajePerVlastnik), 400, y, { width: 110, align: 'right' })
    y += 24

    // Správce signature
    doc.font('Helvetica').fontSize(9)
    doc.text(data.spravce.jmeno, 50, y)
    y += 12
    doc.text(data.spravce.firma, 50, y)
    y += 12
    doc.text(data.spravce.adresa, 50, y)
    y += 12
    if (data.spravce.telefon) { doc.text(`Mobile: ${data.spravce.telefon}`, 50, y); y += 12 }
    if (data.spravce.email) { doc.text(`Email: ${data.spravce.email}`, 50, y) }
  }
}
