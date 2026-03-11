import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthUser, query: any) {
    const { type, isPaid, search } = query;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(isPaid !== undefined ? { isPaid: isPaid === 'true' } : {}),
      ...(search ? {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { supplierName: { contains: search, mode: 'insensitive' } },
          { buyerName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          property: { select: { id: true, name: true } },
          transaction: { select: { id: true, description: true, amount: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: items.map(i => ({
        ...i,
        amountBase: Number(i.amountBase),
        vatAmount: Number(i.vatAmount),
        amountTotal: Number(i.amountTotal),
        issueDate: i.issueDate.toISOString(),
        dueDate: i.dueDate?.toISOString() ?? null,
        paymentDate: i.paymentDate?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async stats(user: AuthUser) {
    const where = { tenantId: user.tenantId, deletedAt: null };
    const [total, unpaid, overdue, totalAmount] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.count({ where: { ...where, isPaid: false } }),
      this.prisma.invoice.count({
        where: { ...where, isPaid: false, dueDate: { lt: new Date() } },
      }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { amountTotal: true },
      }),
    ]);
    return {
      total,
      unpaid,
      overdue,
      totalAmount: Number(totalAmount._sum.amountTotal ?? 0),
    };
  }

  async create(user: AuthUser, dto: any) {
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId || null,
        number: dto.number,
        type: dto.type || 'received',
        supplierName: dto.supplierName || null,
        supplierIco: dto.supplierIco || null,
        supplierDic: dto.supplierDic || null,
        buyerName: dto.buyerName || null,
        buyerIco: dto.buyerIco || null,
        buyerDic: dto.buyerDic || null,
        description: dto.description || null,
        amountBase: dto.amountBase || 0,
        vatRate: dto.vatRate || 0,
        vatAmount: dto.vatAmount || 0,
        amountTotal: dto.amountTotal || 0,
        currency: dto.currency || 'CZK',
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        isPaid: dto.isPaid || false,
        variableSymbol: dto.variableSymbol || null,
        transactionId: dto.transactionId || null,
        isdocXml: dto.isdocXml || null,
        note: dto.note || null,
      },
    });
    return {
      ...invoice,
      amountBase: Number(invoice.amountBase),
      vatAmount: Number(invoice.vatAmount),
      amountTotal: Number(invoice.amountTotal),
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paymentDate: invoice.paymentDate?.toISOString() ?? null,
    };
  }

  async update(user: AuthUser, id: string, dto: any) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Doklad nenalezen');

    const data: any = {};
    if (dto.number !== undefined) data.number = dto.number;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.supplierName !== undefined) data.supplierName = dto.supplierName;
    if (dto.supplierIco !== undefined) data.supplierIco = dto.supplierIco;
    if (dto.supplierDic !== undefined) data.supplierDic = dto.supplierDic;
    if (dto.buyerName !== undefined) data.buyerName = dto.buyerName;
    if (dto.buyerIco !== undefined) data.buyerIco = dto.buyerIco;
    if (dto.buyerDic !== undefined) data.buyerDic = dto.buyerDic;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amountBase !== undefined) data.amountBase = dto.amountBase;
    if (dto.vatRate !== undefined) data.vatRate = dto.vatRate;
    if (dto.vatAmount !== undefined) data.vatAmount = dto.vatAmount;
    if (dto.amountTotal !== undefined) data.amountTotal = dto.amountTotal;
    if (dto.issueDate !== undefined) data.issueDate = new Date(dto.issueDate);
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.paymentDate !== undefined) data.paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : null;
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.variableSymbol !== undefined) data.variableSymbol = dto.variableSymbol;
    if (dto.transactionId !== undefined) data.transactionId = dto.transactionId || null;
    if (dto.note !== undefined) data.note = dto.note;

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data,
    });
    return {
      ...invoice,
      amountBase: Number(invoice.amountBase),
      vatAmount: Number(invoice.vatAmount),
      amountTotal: Number(invoice.amountTotal),
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paymentDate: invoice.paymentDate?.toISOString() ?? null,
    };
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Doklad nenalezen');
    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markPaid(user: AuthUser, id: string) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Doklad nenalezen');
    return this.prisma.invoice.update({
      where: { id },
      data: { isPaid: true, paymentDate: new Date() },
    });
  }

  async importIsdoc(user: AuthUser, xmlContent: string) {
    // Parse ISDOC XML to extract invoice data
    const parsed = this.parseIsdocXml(xmlContent);
    return this.create(user, { ...parsed, isdocXml: xmlContent });
  }

  async exportIsdoc(user: AuthUser, id: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Doklad nenalezen');

    // If we have stored ISDOC XML, return it
    if (invoice.isdocXml) return invoice.isdocXml;

    // Generate ISDOC XML
    return this.generateIsdocXml(invoice);
  }

  private parseIsdocXml(xml: string): Record<string, unknown> {
    // Simple regex-based ISDOC parser for key fields
    const get = (tag: string) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return match?.[1]?.trim() || '';
    };
    const getNum = (tag: string) => parseFloat(get(tag)) || 0;

    return {
      number: get('ID') || get('DocumentNumber') || `ISDOC-${Date.now()}`,
      type: 'received',
      supplierName: get('Name') || get('TradeName') || get('PartyName'),
      supplierIco: get('CompanyID') || get('IČ'),
      supplierDic: get('TaxRegistrationID') || get('DIČ'),
      description: get('Note') || get('Description') || '',
      amountBase: getNum('TaxExclusiveAmount') || getNum('TaxableAmount'),
      vatAmount: getNum('TaxAmount') || getNum('DifferenceTaxAmount'),
      amountTotal: getNum('TaxInclusiveAmount') || getNum('PayableAmount') || getNum('PaidDepositsAmount') || getNum('PayableRoundingAmount'),
      vatRate: Math.round((getNum('TaxAmount') / (getNum('TaxExclusiveAmount') || 1)) * 100) || 0,
      currency: get('CurrencyCode') || 'CZK',
      issueDate: get('IssueDate') || new Date().toISOString().slice(0, 10),
      dueDate: get('DueDate') || '',
      variableSymbol: get('VariableSymbol') || get('ID') || '',
    };
  }

  private generateIsdocXml(invoice: any): string {
    const escXml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtDate = (d: Date | string | null) => {
      if (!d) return '';
      const dt = typeof d === 'string' ? new Date(d) : d;
      return dt.toISOString().slice(0, 10);
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:isdoc:invoice:6" version="6.0.2">
  <DocumentType>1</DocumentType>
  <ID>${escXml(invoice.number)}</ID>
  <IssueDate>${fmtDate(invoice.issueDate)}</IssueDate>
  <DueDate>${fmtDate(invoice.dueDate)}</DueDate>
  <Note>${escXml(invoice.description || '')}</Note>
  <CurrencyCode>${escXml(invoice.currency || 'CZK')}</CurrencyCode>
  <AccountingSupplierParty>
    <Party>
      <PartyName><Name>${escXml(invoice.supplierName || '')}</Name></PartyName>
      <PartyIdentification><ID>${escXml(invoice.supplierIco || '')}</ID></PartyIdentification>
    </Party>
  </AccountingSupplierParty>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>${Number(invoice.amountBase)}</TaxExclusiveAmount>
    <TaxInclusiveAmount>${Number(invoice.amountTotal)}</TaxInclusiveAmount>
    <PayableAmount>${Number(invoice.amountTotal)}</PayableAmount>
  </LegalMonetaryTotal>
  <TaxTotal>
    <TaxAmount>${Number(invoice.vatAmount)}</TaxAmount>
  </TaxTotal>
  <PaymentMeans>
    <Payment>
      <VariableSymbol>${escXml(invoice.variableSymbol || '')}</VariableSymbol>
    </Payment>
  </PaymentMeans>
</Invoice>`;
  }
}
