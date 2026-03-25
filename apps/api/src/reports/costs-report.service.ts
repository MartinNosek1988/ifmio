import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import PDFDocument from 'pdfkit'
import type { AuthUser } from '@ifmio/shared-types'

interface FolderCostRow {
  datum: Date
  cisloDokladu: string
  dodavatel: string
  nazev: string
  vs: string
  castka: number
}

interface FolderCostSection {
  name: string
  code: string | null
  isEvidence: boolean
  rows: FolderCostRow[]
  total: number
}

interface CostsByFolderData {
  property: { name: string; ico: string | null; address: string }
  spravce: { firma: string; adresa: string; ic: string; dic: string; email: string }
  year: number
  sections: FolderCostSection[]
  grandTotal: number
  vytiskl: string
}

function fmtCzk(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' Kč'
}

function fmtDate(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

@Injectable()
export class CostsReportService {
  constructor(private prisma: PrismaService) {}

  async generateData(user: AuthUser, params: { propertyId: string; year: number }): Promise<CostsByFolderData> {
    const { propertyId, year } = params
    const tenantId = user.tenantId
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } })
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })

    const spravce = {
      firma: settings?.orgName ?? tenant?.name ?? '',
      adresa: [settings?.orgStreet, settings?.orgCity, settings?.orgZip].filter(Boolean).join(', '),
      ic: tenant?.ico ?? settings?.companyNumber ?? '',
      dic: tenant?.dic ?? settings?.vatNumber ?? '',
      email: settings?.orgEmail ?? '',
    }

    const sections: FolderCostSection[] = []

    // Prescription components
    const components = await this.prisma.prescriptionComponent.findMany({
      where: { tenantId, propertyId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    for (const comp of components) {
      const allocations = await this.prisma.invoiceCostAllocation.findMany({
        where: {
          componentId: comp.id,
          invoice: { issueDate: { gte: yearStart, lte: yearEnd }, deletedAt: null },
        },
        include: {
          invoice: { select: { issueDate: true, number: true, supplierName: true, description: true, variableSymbol: true } },
        },
        orderBy: { invoice: { issueDate: 'asc' } },
      })

      const rows: FolderCostRow[] = allocations.map(a => ({
        datum: a.invoice.issueDate,
        cisloDokladu: a.invoice.number ?? '',
        dodavatel: a.invoice.supplierName ?? '',
        nazev: a.invoice.description ?? '',
        vs: a.invoice.variableSymbol ?? '',
        castka: Number(a.amount),
      }))

      sections.push({
        name: comp.name,
        code: comp.code,
        isEvidence: false,
        rows,
        total: rows.reduce((s, r) => s + r.castka, 0),
      })
    }

    // Evidence folders
    const evidFolders = await this.prisma.evidenceFolder.findMany({
      where: { tenantId, propertyId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    for (const folder of evidFolders) {
      const allocations = await this.prisma.evidenceFolderAllocation.findMany({
        where: {
          evidenceFolderId: folder.id,
          invoice: { issueDate: { gte: yearStart, lte: yearEnd }, deletedAt: null },
        },
        include: {
          invoice: { select: { issueDate: true, number: true, supplierName: true, description: true, variableSymbol: true } },
        },
        orderBy: { invoice: { issueDate: 'asc' } },
      })

      const rows: FolderCostRow[] = allocations.map(a => ({
        datum: a.invoice.issueDate,
        cisloDokladu: a.invoice.number ?? '',
        dodavatel: a.invoice.supplierName ?? '',
        nazev: a.invoice.description ?? '',
        vs: a.invoice.variableSymbol ?? '',
        castka: Number(a.amount),
      }))

      sections.push({
        name: folder.name,
        code: folder.code,
        isEvidence: true,
        rows,
        total: rows.reduce((s, r) => s + r.castka, 0),
      })
    }

    return {
      property: {
        name: property.name,
        ico: property.ico,
        address: `${property.address}, ${property.city} ${property.postalCode}`,
      },
      spravce,
      year,
      sections,
      grandTotal: sections.reduce((s, sec) => s + sec.total, 0),
      vytiskl: user.name ?? 'Neznámý uživatel',
    }
  }

  async generatePdf(data: CostsByFolderData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageW = 595.28 - 100
      let y = 50

      // Header
      doc.font('Helvetica').fontSize(9)
      doc.text(`${data.spravce.firma}, ${data.spravce.adresa}`, 50, y)
      doc.text(`IČ: ${data.spravce.ic}, DIČ: ${data.spravce.dic}`, 50, y + 12)
      y += 30
      doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#999')
      y += 12

      // Title
      doc.font('Helvetica-Bold').fontSize(12)
      doc.rect(50, y, pageW, 24).stroke('#333')
      doc.text(`Náklady dle složek ${data.year}`, 55, y + 6, { width: pageW - 10 })
      y += 30
      doc.font('Helvetica').fontSize(10)
      doc.text(`${data.property.name}${data.property.ico ? `, IČ: ${data.property.ico}` : ''}`, 50, y)
      doc.text(data.property.address, 50, y + 14)
      y += 36

      // Sections
      const cols = [55, 60, 120, 140, 60, 75]
      const colX = cols.reduce((acc: number[], w, i) => { acc.push(i === 0 ? 50 : acc[i - 1] + cols[i - 1]); return acc }, [] as number[])
      const headers = ['Datum', 'Č. dokl.', 'Dodavatel', 'Název', 'VS', 'Částka']

      for (const section of data.sections) {
        if (y > 680) { doc.addPage(); y = 50 }

        // Section title
        doc.font('Helvetica-Bold').fontSize(10)
        doc.text(`${section.name}${section.isEvidence ? ' (evidenční)' : ''}${section.code ? ` [${section.code}]` : ''}`, 50, y)
        y += 14
        doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
        y += 4

        if (section.rows.length === 0) {
          doc.font('Helvetica-Oblique').fontSize(8).text('Žádné náklady', 50, y)
          y += 18
          continue
        }

        // Table header
        doc.font('Helvetica-Bold').fontSize(8)
        headers.forEach((h, i) => doc.text(h, colX[i], y, { width: cols[i], align: i === 5 ? 'right' : 'left' }))
        y += 11
        doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#eee')
        y += 3

        // Rows
        doc.font('Helvetica').fontSize(8)
        for (const row of section.rows) {
          if (y > 730) { doc.addPage(); y = 50 }
          doc.text(fmtDate(row.datum), colX[0], y, { width: cols[0] })
          doc.text(row.cisloDokladu.slice(0, 10), colX[1], y, { width: cols[1] })
          doc.text(row.dodavatel.slice(0, 20), colX[2], y, { width: cols[2] })
          doc.text(row.nazev.slice(0, 25), colX[3], y, { width: cols[3] })
          doc.text(row.vs, colX[4], y, { width: cols[4] })
          doc.text(fmtCzk(row.castka), colX[5], y, { width: cols[5], align: 'right' })
          y += 11
        }

        // Section total
        y += 2
        doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#ccc')
        y += 4
        doc.font('Helvetica-Bold').fontSize(8)
        doc.text('Celkem', colX[0], y)
        doc.text(fmtCzk(section.total), colX[5], y, { width: cols[5], align: 'right' })
        y += 18
      }

      // Grand total
      if (y > 720) { doc.addPage(); y = 50 }
      y += 4
      doc.moveTo(50, y).lineTo(50 + pageW, y).stroke('#333')
      y += 6
      doc.font('Helvetica-Bold').fontSize(10)
      doc.text('Celkem všechny složky', 50, y)
      doc.text(fmtCzk(data.grandTotal), 400, y, { width: 110, align: 'right' })

      // Footer
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        const fy = 780
        doc.font('Helvetica').fontSize(8)
        doc.moveTo(50, fy).lineTo(50 + pageW, fy).stroke('#ccc')
        doc.text(`Vytiskl: ${data.vytiskl}`, 50, fy + 4, { continued: true })
        doc.text(`   Strana ${i + 1} z ${totalPages}`, { continued: true })
        doc.text(`   Dne: ${fmtDate(new Date())}`)
      }

      doc.end()
    })
  }
}
