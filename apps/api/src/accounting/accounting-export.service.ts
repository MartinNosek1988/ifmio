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
  includeBankTransactions?: boolean
  bankAccountId?: string
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

  // ─── HELPERS: Load data ──────────────────────────────────────

  private async loadBankTransactions(tenantId: string, opts: ExportOptions) {
    const where: any = {
      tenantId,
      status: { not: 'ignored' },
      date: { gte: new Date(opts.from), lte: new Date(opts.to) },
    }
    if (opts.bankAccountId) where.bankAccountId = opts.bankAccountId
    else if (opts.propertyId) where.bankAccount = { propertyId: opts.propertyId }

    return this.prisma.bankTransaction.findMany({
      where,
      include: { bankAccount: { select: { accountNumber: true, bankCode: true } } },
      orderBy: { date: 'asc' },
    })
  }

  private async getOrganizationIco(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { companyNumber: true },
    })
    return settings?.companyNumber ?? ''
  }

  private mapVatRate(rate: number): string {
    if (rate >= 21) return 'high'
    if (rate >= 12) return 'low'
    return 'none'
  }

  // ─── POHODA XML ─────────────────────────────────────────────────

  async exportPohoda(user: AuthUser, opts: ExportOptions): Promise<Buffer> {
    await this.scope.verifyPropertyAccess(user, opts.propertyId)
    const [invoices, prescriptions, presets, transactions, ico] = await Promise.all([
      opts.type !== 'prescriptions' ? this.loadInvoices(user.tenantId, opts) : Promise.resolve([]),
      opts.type !== 'invoices' ? this.loadPrescriptions(user.tenantId, opts) : Promise.resolve([]),
      this.loadPresets(user.tenantId, opts.propertyId),
      opts.includeBankTransactions ? this.loadBankTransactions(user.tenantId, opts) : Promise.resolve([]),
      this.getOrganizationIco(user.tenantId),
    ])

    const presetMap = new Map(presets.map(p => [p.transactionType, p]))

    let xml = `<?xml version="1.0" encoding="Windows-1250"?>\n`
    xml += `<dat:dataPack version="2.0" id="ifmio-export" ico="${this.esc(ico)}" application="ifmio" note="Export z ifmio"\n`
    xml += `  xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"\n`
    xml += `  xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"\n`
    xml += `  xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd"\n`
    xml += `  xmlns:bnk="http://www.stormware.cz/schema/version_2/bank.xsd">\n`

    // ── Invoices ──
    for (const inv of invoices) {
      const isIssued = inv.type === 'issued'
      const preset = presetMap.get(isIssued ? 'invoice_issued' : 'invoice_received')
      xml += `  <dat:dataPackItem version="2.0" id="inv-${this.esc(inv.id.slice(0, 8))}">\n`
      xml += `    <inv:invoice version="2.0">\n`
      xml += `      <inv:invoiceHeader>\n`
      xml += `        <inv:invoiceType>${isIssued ? 'issuedInvoice' : 'receivedInvoice'}</inv:invoiceType>\n`
      xml += `        <inv:number><typ:numberRequested>${this.esc(inv.number)}</typ:numberRequested></inv:number>\n`
      if (inv.variableSymbol) xml += `        <inv:symVar>${this.esc(inv.variableSymbol)}</inv:symVar>\n`
      xml += `        <inv:date>${this.fmtDate(inv.issueDate)}</inv:date>\n`
      if (inv.duzp) xml += `        <inv:dateTax>${this.fmtDate(inv.duzp)}</inv:dateTax>\n`
      if (inv.dueDate) xml += `        <inv:dateDue>${this.fmtDate(inv.dueDate)}</inv:dateDue>\n`
      if (inv.description) xml += `        <inv:text>${this.esc(inv.description)}</inv:text>\n`
      if (preset) xml += `        <inv:accounting><typ:ids>${this.esc(preset.debitAccount)}</typ:ids></inv:accounting>\n`
      const party = isIssued ? inv.buyerName : inv.supplierName
      const partyIco = isIssued ? inv.buyerIco : inv.supplierIco
      if (party) {
        xml += `        <inv:partnerIdentity>\n`
        xml += `          <typ:address><typ:company>${this.esc(party)}</typ:company>`
        if (partyIco) xml += `<typ:ico>${this.esc(partyIco)}</typ:ico>`
        xml += `</typ:address>\n`
        xml += `        </inv:partnerIdentity>\n`
      }
      xml += `      </inv:invoiceHeader>\n`
      xml += `      <inv:invoiceDetail>\n`

      // Items from cost allocations or fallback to single item
      let priceNone = 0, priceLow = 0, priceHigh = 0, priceHighVat = 0, priceLowVat = 0
      if (inv.costAllocations && inv.costAllocations.length > 0) {
        for (const alloc of inv.costAllocations) {
          const amt = Number(alloc.amount)
          const vr = Number(alloc.vatRate ?? 0)
          const vatStr = this.mapVatRate(vr)
          xml += `        <inv:invoiceItem>\n`
          xml += `          <inv:text>${this.esc(alloc.component?.name ?? 'Položka')}</inv:text>\n`
          xml += `          <inv:quantity>1</inv:quantity><inv:unit>ks</inv:unit>\n`
          xml += `          <inv:rateVAT>${vatStr}</inv:rateVAT>\n`
          xml += `          <inv:homeCurrency><typ:unitPrice>${amt.toFixed(2)}</typ:unitPrice></inv:homeCurrency>\n`
          if (alloc.component?.accountingCode) xml += `          <inv:accounting><typ:ids>${this.esc(alloc.component.accountingCode)}</typ:ids></inv:accounting>\n`
          xml += `        </inv:invoiceItem>\n`
          if (vatStr === 'none') priceNone += amt
          else if (vatStr === 'low') { priceLow += amt; priceLowVat += amt * (vr / 100) }
          else { priceHigh += amt; priceHighVat += amt * (vr / 100) }
        }
      } else {
        const amt = Number(inv.amountBase ?? inv.amountTotal)
        const vr = Number(inv.vatRate ?? 0)
        const vatStr = this.mapVatRate(vr)
        xml += `        <inv:invoiceItem>\n`
        xml += `          <inv:text>${this.esc(inv.description ?? 'Doklad')}</inv:text>\n`
        xml += `          <inv:quantity>1</inv:quantity><inv:unit>ks</inv:unit>\n`
        xml += `          <inv:rateVAT>${vatStr}</inv:rateVAT>\n`
        xml += `          <inv:homeCurrency><typ:unitPrice>${amt.toFixed(2)}</typ:unitPrice></inv:homeCurrency>\n`
        xml += `        </inv:invoiceItem>\n`
        if (vatStr === 'none') priceNone += amt
        else if (vatStr === 'low') { priceLow += amt; priceLowVat += Number(inv.vatAmount ?? 0) }
        else { priceHigh += amt; priceHighVat += Number(inv.vatAmount ?? 0) }
      }

      xml += `      </inv:invoiceDetail>\n`
      xml += `      <inv:invoiceSummary>\n`
      xml += `        <inv:roundingDocument>math2one</inv:roundingDocument>\n`
      xml += `        <inv:homeCurrency>\n`
      xml += `          <typ:priceNone>${priceNone.toFixed(2)}</typ:priceNone>\n`
      xml += `          <typ:priceLow>${priceLow.toFixed(2)}</typ:priceLow>\n`
      xml += `          <typ:priceLowVAT>${priceLowVat.toFixed(2)}</typ:priceLowVAT>\n`
      xml += `          <typ:priceHigh>${priceHigh.toFixed(2)}</typ:priceHigh>\n`
      xml += `          <typ:priceHighVAT>${priceHighVat.toFixed(2)}</typ:priceHighVAT>\n`
      xml += `        </inv:homeCurrency>\n`
      xml += `      </inv:invoiceSummary>\n`
      xml += `    </inv:invoice>\n`
      xml += `  </dat:dataPackItem>\n`
    }

    // ── Prescriptions as issued invoices ──
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
      if (p.variableSymbol) xml += `        <inv:symVar>${this.esc(p.variableSymbol)}</inv:symVar>\n`
      xml += `        <inv:date>${this.fmtDate(p.validFrom)}</inv:date>\n`
      xml += `        <inv:dateTax>${this.fmtDate(p.validFrom)}</inv:dateTax>\n`
      xml += `        <inv:text>${this.esc(p.description)}</inv:text>\n`
      if (preset) xml += `        <inv:accounting><typ:ids>${this.esc(preset.debitAccount)}</typ:ids></inv:accounting>\n`
      if (resName) xml += `        <inv:partnerIdentity><typ:address><typ:company>${this.esc(resName)}</typ:company></typ:address></inv:partnerIdentity>\n`
      xml += `      </inv:invoiceHeader>\n`
      xml += `      <inv:invoiceDetail>\n`
      let pTotal = 0
      for (const item of p.items) {
        const amt = Number(item.amount)
        xml += `        <inv:invoiceItem>\n`
        xml += `          <inv:text>${this.esc(item.name)}</inv:text>\n`
        xml += `          <inv:quantity>1</inv:quantity><inv:unit>ks</inv:unit>\n`
        xml += `          <inv:rateVAT>${this.mapVatRate(item.vatRate)}</inv:rateVAT>\n`
        xml += `          <inv:homeCurrency><typ:unitPrice>${amt.toFixed(2)}</typ:unitPrice></inv:homeCurrency>\n`
        xml += `        </inv:invoiceItem>\n`
        pTotal += amt
      }
      xml += `      </inv:invoiceDetail>\n`
      xml += `      <inv:invoiceSummary>\n`
      xml += `        <inv:homeCurrency><typ:priceNone>${pTotal.toFixed(2)}</typ:priceNone></inv:homeCurrency>\n`
      xml += `      </inv:invoiceSummary>\n`
      xml += `    </inv:invoice>\n`
      xml += `  </dat:dataPackItem>\n`
    }

    // ── Bank transactions ──
    for (const tx of transactions) {
      const amt = Math.abs(Number(tx.amount))
      const isReceipt = Number(tx.amount) >= 0
      xml += `  <dat:dataPackItem version="2.0" id="bnk-${this.esc(tx.id.slice(0, 8))}">\n`
      xml += `    <bnk:bank version="2.0">\n`
      xml += `      <bnk:bankHeader>\n`
      xml += `        <bnk:bankType>${isReceipt ? 'receipt' : 'expense'}</bnk:bankType>\n`
      if (tx.bankAccount) {
        xml += `        <bnk:account>\n`
        xml += `          <typ:accountNo>${this.esc(tx.bankAccount.accountNumber)}</typ:accountNo>\n`
        if (tx.bankAccount.bankCode) xml += `          <typ:bankCode>${this.esc(tx.bankAccount.bankCode)}</typ:bankCode>\n`
        xml += `        </bnk:account>\n`
      }
      if (tx.variableSymbol) xml += `        <bnk:symVar>${this.esc(tx.variableSymbol)}</bnk:symVar>\n`
      if (tx.constantSymbol) xml += `        <bnk:symConst>${this.esc(tx.constantSymbol)}</bnk:symConst>\n`
      if (tx.specificSymbol) xml += `        <bnk:symSpec>${this.esc(tx.specificSymbol)}</bnk:symSpec>\n`
      xml += `        <bnk:dateStatement>${this.fmtDate(tx.date)}</bnk:dateStatement>\n`
      xml += `        <bnk:datePayment>${this.fmtDate(tx.bookingDate ?? tx.date)}</bnk:datePayment>\n`
      if (tx.description) xml += `        <bnk:text>${this.esc(tx.description)}</bnk:text>\n`
      if (tx.counterparty) {
        xml += `        <bnk:partnerIdentity><typ:address><typ:company>${this.esc(tx.counterparty)}</typ:company></typ:address></bnk:partnerIdentity>\n`
      }
      xml += `        <bnk:homeCurrency><typ:priceNone>${amt.toFixed(2)}</typ:priceNone></bnk:homeCurrency>\n`
      xml += `      </bnk:bankHeader>\n`
      xml += `    </bnk:bank>\n`
      xml += `  </dat:dataPackItem>\n`
    }

    xml += `</dat:dataPack>\n`
    return iconv.encode(xml, 'win1250')
  }

  // ─── POHODA PREVIEW ──────────────────────────────────────────────

  async previewPohoda(user: AuthUser, opts: ExportOptions) {
    await this.scope.verifyPropertyAccess(user, opts.propertyId)
    const [invoices, prescriptions, transactions] = await Promise.all([
      opts.type !== 'prescriptions' ? this.loadInvoices(user.tenantId, opts) : Promise.resolve([]),
      opts.type !== 'invoices' ? this.loadPrescriptions(user.tenantId, opts) : Promise.resolve([]),
      opts.includeBankTransactions ? this.loadBankTransactions(user.tenantId, opts) : Promise.resolve([]),
    ])

    const invoiceAmount = invoices.reduce((s, i) => s + Number(i.amountTotal), 0)
    const prescriptionAmount = prescriptions.reduce((s, p) => s + Number(p.amount), 0)
    const bankAmount = transactions.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

    return {
      invoiceCount: invoices.length,
      prescriptionCount: prescriptions.length,
      bankTransactionCount: transactions.length,
      invoiceAmount: Math.round(invoiceAmount * 100) / 100,
      prescriptionAmount: Math.round(prescriptionAmount * 100) / 100,
      bankAmount: Math.round(bankAmount * 100) / 100,
      totalRecords: invoices.length + prescriptions.length + transactions.length,
      dateRange: `${new Date(opts.from).toLocaleDateString('cs-CZ')} – ${new Date(opts.to).toLocaleDateString('cs-CZ')}`,
    }
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
