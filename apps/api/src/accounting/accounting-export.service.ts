import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import * as iconv from 'iconv-lite'
import type { AuthUser } from '@ifmio/shared-types'

interface ExportOptions {
  propertyId: string
  from: string
  to: string
  type: 'invoices' | 'prescriptions' | 'all'
}

@Injectable()
export class AccountingExportService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  private async loadInvoices(tenantId: string, opts: ExportOptions) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        propertyId: opts.propertyId,
        deletedAt: null,
        issueDate: { gte: new Date(opts.from), lte: new Date(opts.to) },
      },
      include: {
        costAllocations: { include: { component: { select: { accountingCode: true, name: true } } } },
      },
      orderBy: { issueDate: 'asc' },
    })
  }

  private async loadPrescriptions(tenantId: string, opts: ExportOptions) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId,
        propertyId: opts.propertyId,
        status: 'active',
        validFrom: { gte: new Date(opts.from), lte: new Date(opts.to) },
      },
      include: {
        items: true,
        resident: { select: { firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
      },
      orderBy: { validFrom: 'asc' },
    })
  }

  private async loadPresets(tenantId: string, propertyId: string) {
    return this.prisma.accountingPreset.findMany({
      where: { tenantId, OR: [{ propertyId }, { propertyId: null }], isActive: true },
    })
  }

  // ─── POHODA XML ─────────────────────────────────────────────────

  async exportPohoda(user: AuthUser, opts: ExportOptions): Promise<Buffer> {
    await this.scope.verifyPropertyAccess(user, opts.propertyId)
    const [invoices, prescriptions, presets] = await Promise.all([
      opts.type !== 'prescriptions' ? this.loadInvoices(user.tenantId, opts) : Promise.resolve([]),
      opts.type !== 'invoices' ? this.loadPrescriptions(user.tenantId, opts) : Promise.resolve([]),
      this.loadPresets(user.tenantId, opts.propertyId),
    ])

    const presetMap = new Map(presets.map(p => [p.transactionType, p]))

    let xml = `<?xml version="1.0" encoding="Windows-1252"?>\n`
    xml += `<dat:dataPack version="2.0" id="ifmio-export" ico="" application="ifmio" note="Export z ifmio"\n`
    xml += `  xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"\n`
    xml += `  xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"\n`
    xml += `  xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">\n`

    // Invoices
    for (const inv of invoices) {
      const isIssued = inv.type === 'issued'
      const preset = presetMap.get(isIssued ? 'invoice_issued' : 'invoice_received')
      xml += `  <dat:dataPackItem version="2.0" id="inv-${this.esc(inv.id.slice(0, 8))}">\n`
      xml += `    <inv:invoice version="2.0">\n`
      xml += `      <inv:invoiceHeader>\n`
      xml += `        <inv:invoiceType>${isIssued ? 'issuedInvoice' : 'receivedInvoice'}</inv:invoiceType>\n`
      xml += `        <inv:number><typ:numberRequested>${this.esc(inv.number)}</typ:numberRequested></inv:number>\n`
      xml += `        <inv:date>${this.fmtDate(inv.issueDate)}</inv:date>\n`
      if (inv.dueDate) xml += `        <inv:dateDue>${this.fmtDate(inv.dueDate)}</inv:dateDue>\n`
      if (preset) xml += `        <inv:accounting><typ:ids>${this.esc(preset.debitAccount)}</typ:ids></inv:accounting>\n`
      if (inv.variableSymbol) xml += `        <inv:symVar>${this.esc(inv.variableSymbol)}</inv:symVar>\n`
      const party = isIssued ? inv.buyerName : inv.supplierName
      const ico = isIssued ? inv.buyerIco : inv.supplierIco
      if (party) {
        xml += `        <inv:partnerIdentity>\n`
        xml += `          <typ:address><typ:company>${this.esc(party)}</typ:company>`
        if (ico) xml += `<typ:ico>${this.esc(ico)}</typ:ico>`
        xml += `</typ:address>\n`
        xml += `        </inv:partnerIdentity>\n`
      }
      xml += `      </inv:invoiceHeader>\n`
      xml += `      <inv:invoiceDetail>\n`

      if (inv.costAllocations && inv.costAllocations.length > 0) {
        for (const alloc of inv.costAllocations) {
          xml += `        <inv:invoiceItem>\n`
          xml += `          <inv:text>${this.esc(alloc.component?.name ?? 'Položka')}</inv:text>\n`
          xml += `          <inv:quantity>1</inv:quantity>\n`
          xml += `          <inv:rateVAT>${Number(alloc.vatRate ?? 0) > 0 ? 'high' : 'none'}</inv:rateVAT>\n`
          xml += `          <inv:homeCurrency><typ:unitPrice>${Number(alloc.amount)}</typ:unitPrice></inv:homeCurrency>\n`
          if (alloc.component?.accountingCode) {
            xml += `          <inv:accounting><typ:ids>${this.esc(alloc.component.accountingCode)}</typ:ids></inv:accounting>\n`
          }
          xml += `        </inv:invoiceItem>\n`
        }
      } else {
        xml += `        <inv:invoiceItem>\n`
        xml += `          <inv:text>${this.esc(inv.description ?? 'Doklad')}</inv:text>\n`
        xml += `          <inv:quantity>1</inv:quantity>\n`
        xml += `          <inv:rateVAT>${Number(inv.vatRate) > 0 ? 'high' : 'none'}</inv:rateVAT>\n`
        xml += `          <inv:homeCurrency><typ:unitPrice>${Number(inv.amountTotal)}</typ:unitPrice></inv:homeCurrency>\n`
        xml += `        </inv:invoiceItem>\n`
      }

      xml += `      </inv:invoiceDetail>\n`
      xml += `    </inv:invoice>\n`
      xml += `  </dat:dataPackItem>\n`
    }

    // Prescriptions as issued invoices
    for (const p of prescriptions) {
      const resName = p.resident
        ? (p.resident.isLegalEntity && p.resident.companyName ? p.resident.companyName : `${p.resident.firstName} ${p.resident.lastName}`)
        : ''
      const preset = presetMap.get('prescription')
      xml += `  <dat:dataPackItem version="2.0" id="pre-${this.esc(p.id.slice(0, 8))}">\n`
      xml += `    <inv:invoice version="2.0">\n`
      xml += `      <inv:invoiceHeader>\n`
      xml += `        <inv:invoiceType>issuedInvoice</inv:invoiceType>\n`
      xml += `        <inv:number><typ:numberRequested>${this.esc(p.variableSymbol ?? p.id.slice(0, 8))}</typ:numberRequested></inv:number>\n`
      xml += `        <inv:date>${this.fmtDate(p.validFrom)}</inv:date>\n`
      if (preset) xml += `        <inv:accounting><typ:ids>${this.esc(preset.debitAccount)}</typ:ids></inv:accounting>\n`
      if (p.variableSymbol) xml += `        <inv:symVar>${this.esc(p.variableSymbol)}</inv:symVar>\n`
      if (resName) {
        xml += `        <inv:partnerIdentity><typ:address><typ:company>${this.esc(resName)}</typ:company></typ:address></inv:partnerIdentity>\n`
      }
      xml += `      </inv:invoiceHeader>\n`
      xml += `      <inv:invoiceDetail>\n`
      for (const item of p.items) {
        xml += `        <inv:invoiceItem>\n`
        xml += `          <inv:text>${this.esc(item.name)}</inv:text>\n`
        xml += `          <inv:quantity>1</inv:quantity>\n`
        xml += `          <inv:rateVAT>${item.vatRate > 0 ? 'high' : 'none'}</inv:rateVAT>\n`
        xml += `          <inv:homeCurrency><typ:unitPrice>${Number(item.amount)}</typ:unitPrice></inv:homeCurrency>\n`
        xml += `        </inv:invoiceItem>\n`
      }
      xml += `      </inv:invoiceDetail>\n`
      xml += `    </inv:invoice>\n`
      xml += `  </dat:dataPackItem>\n`
    }

    xml += `</dat:dataPack>\n`
    return iconv.encode(xml, 'win1252')
  }

  // ─── MONEY S3 XML ──────────────────────────────────────────────

  async exportMoneyS3(user: AuthUser, opts: ExportOptions): Promise<Buffer> {
    await this.scope.verifyPropertyAccess(user, opts.propertyId)
    const [invoices, prescriptions] = await Promise.all([
      opts.type !== 'prescriptions' ? this.loadInvoices(user.tenantId, opts) : Promise.resolve([]),
      opts.type !== 'invoices' ? this.loadPrescriptions(user.tenantId, opts) : Promise.resolve([]),
    ])

    let xml = `<?xml version="1.0" encoding="Windows-1252"?>\n<MoneyData>\n`

    // Received invoices
    const received = invoices.filter(i => i.type === 'received')
    if (received.length > 0) {
      xml += `  <SeznamFaktPrij>\n`
      for (const inv of received) {
        xml += this.moneyInvoice(inv, 'FaktPrij')
      }
      xml += `  </SeznamFaktPrij>\n`
    }

    // Issued invoices + prescriptions
    const issued = [
      ...invoices.filter(i => i.type === 'issued'),
    ]
    if (issued.length > 0 || prescriptions.length > 0) {
      xml += `  <SeznamFaktVyd>\n`
      for (const inv of issued) {
        xml += this.moneyInvoice(inv, 'FaktVyd')
      }
      for (const p of prescriptions) {
        const resName = p.resident
          ? (p.resident.isLegalEntity && p.resident.companyName ? p.resident.companyName : `${p.resident.firstName} ${p.resident.lastName}`)
          : ''
        xml += `    <FaktVyd>\n`
        xml += `      <Doklad>${this.esc(p.variableSymbol ?? p.id.slice(0, 8))}</Doklad>\n`
        xml += `      <Popis>${this.esc(p.description)}</Popis>\n`
        xml += `      <DatVyst>${this.fmtDateCz(p.validFrom)}</DatVyst>\n`
        if (resName) {
          xml += `      <DodOdb><ObchNazev>${this.esc(resName)}</ObchNazev></DodOdb>\n`
        }
        xml += `      <SeznamPolozek>\n`
        for (const item of p.items) {
          xml += `        <Polozka>\n`
          xml += `          <Popis>${this.esc(item.name)}</Popis>\n`
          xml += `          <PocetMJ>1</PocetMJ>\n`
          xml += `          <Cena>${Number(item.amount)}</Cena>\n`
          xml += `          <SazbaDPH>${item.vatRate}</SazbaDPH>\n`
          xml += `        </Polozka>\n`
        }
        xml += `      </SeznamPolozek>\n`
        xml += `    </FaktVyd>\n`
      }
      xml += `  </SeznamFaktVyd>\n`
    }

    xml += `</MoneyData>\n`
    return iconv.encode(xml, 'win1252')
  }

  private moneyInvoice(inv: any, tag: string): string {
    let xml = `    <${tag}>\n`
    xml += `      <Doklad>${this.esc(inv.number)}</Doklad>\n`
    xml += `      <Popis>${this.esc(inv.description ?? '')}</Popis>\n`
    xml += `      <DatVyst>${this.fmtDateCz(inv.issueDate)}</DatVyst>\n`
    if (inv.dueDate) xml += `      <DatSplat>${this.fmtDateCz(inv.dueDate)}</DatSplat>\n`
    const party = tag === 'FaktVyd' ? inv.buyerName : inv.supplierName
    const ico = tag === 'FaktVyd' ? inv.buyerIco : inv.supplierIco
    if (party) {
      xml += `      <DodOdb><ObchNazev>${this.esc(party)}</ObchNazev>`
      if (ico) xml += `<ICO>${this.esc(ico)}</ICO>`
      xml += `</DodOdb>\n`
    }
    xml += `      <SeznamPolozek>\n`
    if (inv.costAllocations?.length > 0) {
      for (const a of inv.costAllocations) {
        xml += `        <Polozka><Popis>${this.esc(a.component?.name ?? 'Položka')}</Popis>`
        xml += `<PocetMJ>1</PocetMJ><Cena>${Number(a.amount)}</Cena>`
        xml += `<SazbaDPH>${Number(a.vatRate ?? 0)}</SazbaDPH>`
        if (a.component?.accountingCode) xml += `<Ucet>${this.esc(a.component.accountingCode)}</Ucet>`
        xml += `</Polozka>\n`
      }
    } else {
      xml += `        <Polozka><Popis>${this.esc(inv.description ?? 'Doklad')}</Popis>`
      xml += `<PocetMJ>1</PocetMJ><Cena>${Number(inv.amountTotal)}</Cena>`
      xml += `<SazbaDPH>${inv.vatRate ?? 0}</SazbaDPH></Polozka>\n`
    }
    xml += `      </SeznamPolozek>\n`
    xml += `    </${tag}>\n`
    return xml
  }

  // ─── COST SUMMARY ─────────────────────────────────────────────

  async getCostSummary(user: AuthUser, propertyId: string, year: number) {
    await this.scope.verifyPropertyAccess(user, propertyId)
    const from = new Date(`${year}-01-01`)
    const to = new Date(`${year}-12-31`)

    const allocations = await this.prisma.invoiceCostAllocation.findMany({
      where: {
        invoice: { tenantId: user.tenantId, propertyId, deletedAt: null, issueDate: { gte: from, lte: to } },
      },
      include: {
        component: { select: { id: true, name: true, componentType: true } },
        invoice: { select: { id: true, number: true, issueDate: true } },
      },
    })

    const grouped = new Map<string, { componentId: string; componentName: string; totalCost: number; invoices: any[] }>()
    for (const a of allocations) {
      const key = a.componentId
      if (!grouped.has(key)) {
        grouped.set(key, { componentId: key, componentName: a.component.name, totalCost: 0, invoices: [] })
      }
      const g = grouped.get(key)!
      g.totalCost += Number(a.amount)
      g.invoices.push({ invoiceId: a.invoice.id, invoiceNumber: a.invoice.number, date: a.invoice.issueDate, amount: Number(a.amount) })
    }

    return { year, components: [...grouped.values()] }
  }

  // ─── ACCOUNTING PRESETS ────────────────────────────────────────

  async listPresets(user: AuthUser, propertyId: string) {
    return this.loadPresets(user.tenantId, propertyId)
  }

  async createPreset(user: AuthUser, propertyId: string, dto: { name: string; transactionType: string; debitAccount: string; creditAccount: string; componentId?: string }) {
    return this.prisma.accountingPreset.create({
      data: { tenantId: user.tenantId, propertyId, ...dto },
    })
  }

  async updatePreset(user: AuthUser, id: string, dto: Partial<{ name: string; transactionType: string; debitAccount: string; creditAccount: string; componentId: string; isActive: boolean }>) {
    const preset = await this.prisma.accountingPreset.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!preset) throw new NotFoundException('Předkontace nenalezena')
    return this.prisma.accountingPreset.update({ where: { id }, data: dto })
  }

  async deletePreset(user: AuthUser, id: string) {
    const preset = await this.prisma.accountingPreset.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!preset) throw new NotFoundException('Předkontace nenalezena')
    await this.prisma.accountingPreset.delete({ where: { id } })
  }

  async seedDefaults(user: AuthUser, propertyId: string) {
    const defaults = [
      { name: 'Předpis záloh', transactionType: 'prescription', debitAccount: '315100', creditAccount: '324100' },
      { name: 'Úhrada předpisu', transactionType: 'payment', debitAccount: '221100', creditAccount: '315100' },
      { name: 'Přijatá faktura', transactionType: 'invoice_received', debitAccount: '502100', creditAccount: '321100' },
      { name: 'Úhrada přijaté faktury', transactionType: 'invoice_received_payment', debitAccount: '321100', creditAccount: '221100' },
      { name: 'Fond oprav — předpis', transactionType: 'fund_prescription', debitAccount: '315100', creditAccount: '955100' },
      { name: 'Fond oprav — čerpání', transactionType: 'fund_usage', debitAccount: '955100', creditAccount: '221100' },
    ]
    const created = await this.prisma.accountingPreset.createMany({
      data: defaults.map(d => ({ tenantId: user.tenantId, propertyId, ...d })),
      skipDuplicates: true,
    })
    return { created: created.count }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  private fmtDate(d: Date): string {
    return d.toISOString().slice(0, 10)
  }

  private fmtDateCz(d: Date): string {
    return d.toLocaleDateString('cs-CZ') // DD.MM.YYYY
  }
}
