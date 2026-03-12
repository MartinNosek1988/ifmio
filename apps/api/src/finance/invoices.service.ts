import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceListQueryDto, MarkPaidDto } from './dto/invoice.dto';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async list(user: AuthUser, query: InvoiceListQueryDto) {
    const { type, isPaid, search } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...scopeWhere,
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
        paidAmount: i.paidAmount ? Number(i.paidAmount) : null,
        issueDate: i.issueDate.toISOString(),
        duzp: i.duzp?.toISOString() ?? null,
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
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where = { tenantId: user.tenantId, deletedAt: null, ...scopeWhere } as any;
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

  private async findOneInternal(user: AuthUser, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Doklad nenalezen');
    await this.scope.verifyEntityAccess(user, invoice.propertyId);
    return invoice;
  }

  async create(user: AuthUser, dto: CreateInvoiceDto & { supplierId?: string | null; buyerId?: string | null; isdocXml?: string | null }) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId);
    }
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId || null,
        number: dto.number,
        type: (dto.type || 'received') as any,
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
        duzp: dto.duzp ? new Date(dto.duzp) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        isPaid: dto.isPaid || false,
        variableSymbol: dto.variableSymbol || null,
        transactionId: dto.transactionId || null,
        supplierId: dto.supplierId || null,
        buyerId: dto.buyerId || null,
        lines: dto.lines ? JSON.parse(JSON.stringify(dto.lines)) : undefined,
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
      duzp: invoice.duzp?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paymentDate: invoice.paymentDate?.toISOString() ?? null,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateInvoiceDto) {
    await this.findOneInternal(user, id);

    const data: Record<string, unknown> = {};
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
    if (dto.duzp !== undefined) data.duzp = dto.duzp ? new Date(dto.duzp) : null;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.paymentDate !== undefined) data.paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : null;
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.variableSymbol !== undefined) data.variableSymbol = dto.variableSymbol;
    if (dto.transactionId !== undefined) data.transactionId = dto.transactionId || null;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId || null;
    if (dto.buyerId !== undefined) data.buyerId = dto.buyerId || null;
    if (dto.lines !== undefined) data.lines = dto.lines;
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
      duzp: invoice.duzp?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paymentDate: invoice.paymentDate?.toISOString() ?? null,
    };
  }

  async remove(user: AuthUser, id: string) {
    await this.findOneInternal(user, id);
    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markPaid(user: AuthUser, id: string, dto?: MarkPaidDto) {
    const existing = await this.findOneInternal(user, id);

    const paidAmount = dto?.paidAmount ?? Number(existing.amountTotal);
    const isFullyPaid = paidAmount >= Number(existing.amountTotal);

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        isPaid: isFullyPaid,
        paymentDate: dto?.paidAt ? new Date(dto.paidAt) : new Date(),
        paymentMethod: dto?.paymentMethod || null,
        paidAmount,
        ...(dto?.note !== undefined ? { note: dto.note } : {}),
      },
    });
    return {
      ...invoice,
      amountBase: Number(invoice.amountBase),
      vatAmount: Number(invoice.vatAmount),
      amountTotal: Number(invoice.amountTotal),
      paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
      issueDate: invoice.issueDate.toISOString(),
      duzp: invoice.duzp?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paymentDate: invoice.paymentDate?.toISOString() ?? null,
    };
  }

  async pairWithTransaction(user: AuthUser, invoiceId: string, transactionId: string) {
    await this.findOneInternal(user, invoiceId);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId },
      include: { bankAccount: { select: { propertyId: true } } },
    });
    if (!transaction) throw new NotFoundException('Transakce nenalezena');
    await this.scope.verifyEntityAccess(user, transaction.bankAccount?.propertyId ?? null);

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        transactionId,
        isPaid: true,
        paymentDate: transaction.date,
        paidAmount: Number(transaction.amount),
      },
      include: {
        property: { select: { id: true, name: true } },
        transaction: { select: { id: true, description: true, amount: true } },
      },
    });

    // Also mark the transaction as matched
    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { status: 'matched' },
    });

    return {
      ...updated,
      amountBase: Number(updated.amountBase),
      vatAmount: Number(updated.vatAmount),
      amountTotal: Number(updated.amountTotal),
      paidAmount: updated.paidAmount ? Number(updated.paidAmount) : null,
      issueDate: updated.issueDate.toISOString(),
      duzp: updated.duzp?.toISOString() ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      paymentDate: updated.paymentDate?.toISOString() ?? null,
    };
  }

  async importIsdoc(user: AuthUser, xmlContent: string) {
    // Parse ISDOC XML to extract invoice data
    const parsed = this.parseIsdocXml(xmlContent);

    // Auto-create or find supplier in residents
    const supplierIco = parsed.supplierIco as string;
    const supplierName = parsed.supplierName as string;
    let supplierId: string | null = null;

    if (supplierIco || supplierName) {
      let existing = supplierIco
        ? await this.prisma.resident.findFirst({
            where: { tenantId: user.tenantId, email: supplierIco, isActive: true },
          })
        : null;

      if (!existing && supplierName) {
        existing = await this.prisma.resident.findFirst({
          where: {
            tenantId: user.tenantId,
            isActive: true,
            OR: [
              { lastName: { equals: supplierName, mode: 'insensitive' } },
              { firstName: supplierName.split(' ')[0] || '', lastName: supplierName.split(' ').slice(1).join(' ') || supplierName },
            ],
          },
        });
      }

      if (existing) {
        supplierId = existing.id;
      } else {
        const nameParts = supplierName ? supplierName.split(' ') : ['Dodavatel'];
        const created = await this.prisma.resident.create({
          data: {
            tenantId: user.tenantId,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || nameParts[0] || 'ISDOC',
            email: supplierIco || undefined,
            role: 'contact',
            isActive: true,
          },
        });
        supplierId = created.id;
      }
    }

    // Auto-create or find buyer
    const buyerIco = parsed.buyerIco as string;
    const buyerName = parsed.buyerName as string;
    const buyerDic = parsed.buyerDic as string;
    let buyerId: string | null = null;

    if (buyerIco || buyerName) {
      const tenantSettings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId: user.tenantId },
        select: { companyNumber: true, orgName: true },
      });
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true },
      });

      const isSelf =
        (buyerIco && tenantSettings?.companyNumber && buyerIco === tenantSettings.companyNumber) ||
        (buyerName && tenantSettings?.orgName && buyerName.toLowerCase() === tenantSettings.orgName.toLowerCase()) ||
        (buyerName && tenant?.name && buyerName.toLowerCase() === tenant.name.toLowerCase());

      if (!isSelf) {
        let existingBuyer = buyerIco
          ? await this.prisma.resident.findFirst({
              where: { tenantId: user.tenantId, email: buyerIco, isActive: true },
            })
          : null;

        if (!existingBuyer && buyerName) {
          existingBuyer = await this.prisma.resident.findFirst({
            where: {
              tenantId: user.tenantId,
              isActive: true,
              OR: [
                { lastName: { equals: buyerName, mode: 'insensitive' } },
                { firstName: buyerName.split(' ')[0] || '', lastName: buyerName.split(' ').slice(1).join(' ') || buyerName },
              ],
            },
          });
        }

        if (existingBuyer) {
          buyerId = existingBuyer.id;
        } else {
          const nameParts = buyerName ? buyerName.split(' ') : ['Odběratel'];
          const created = await this.prisma.resident.create({
            data: {
              tenantId: user.tenantId,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || nameParts[0] || 'ISDOC',
              email: buyerIco || undefined,
              role: 'contact',
              isActive: true,
            },
          });
          buyerId = created.id;
        }
      }
    }

    return this.create(user, {
      ...(parsed as unknown as CreateInvoiceDto),
      isdocXml: xmlContent,
      supplierId: supplierId ?? undefined,
      buyerId: buyerId ?? undefined,
    });
  }

  async exportIsdoc(user: AuthUser, id: string): Promise<string> {
    const invoice = await this.findOneInternal(user, id);

    // If we have stored ISDOC XML, return it
    if (invoice.isdocXml) return invoice.isdocXml;

    // Generate ISDOC XML
    return this.generateIsdocXml(invoice);
  }

  private parseIsdocXml(xml: string): Record<string, unknown> {
    const getFrom = (section: string, tag: string) => {
      const match = section.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return match?.[1]?.trim() || '';
    };
    const get = (tag: string) => getFrom(xml, tag);
    const getNum = (tag: string) => parseFloat(get(tag)) || 0;

    const supplierMatch = xml.match(/<AccountingSupplierParty[^>]*>([\s\S]*?)<\/AccountingSupplierParty>/i);
    const supplierXml = supplierMatch?.[1] || '';

    const buyerMatch = xml.match(/<AccountingCustomerParty[^>]*>([\s\S]*?)<\/AccountingCustomerParty>/i);
    const buyerXml = buyerMatch?.[1] || '';

    const parseParty = (section: string) => ({
      name: getFrom(section, 'Name') || getFrom(section, 'TradeName'),
      ico: getFrom(section, 'CompanyID') || getFrom(section, 'IČ'),
      dic: getFrom(section, 'TaxRegistrationID') || getFrom(section, 'DIČ'),
    });

    const supplier = parseParty(supplierXml);
    const buyer = parseParty(buyerXml);

    const lines: Array<Record<string, unknown>> = [];
    const lineRegex = /<InvoiceLine[^>]*>([\s\S]*?)<\/InvoiceLine>/gi;
    let lineMatch: RegExpExecArray | null;
    let lineIdx = 0;
    while ((lineMatch = lineRegex.exec(xml)) !== null) {
      const l = lineMatch[1];
      const description = getFrom(l, 'Name') || getFrom(l, 'Description') || getFrom(l, 'Note') || `Položka ${++lineIdx}`;
      const quantity = parseFloat(getFrom(l, 'InvoicedQuantity')) || 1;
      const unit = getFrom(l, 'unitCode') || getFrom(l, 'InvoicedQuantity').replace(/[\d.]/g, '').trim() || 'ks';
      const unitPrice = parseFloat(getFrom(l, 'PriceAmount')) || 0;
      const lineTotal = parseFloat(getFrom(l, 'LineExtensionAmount')) || quantity * unitPrice;
      const vatRate = parseFloat(getFrom(l, 'Percent')) || 0;
      const vatAmount = Math.round(lineTotal * vatRate / 100 * 100) / 100;
      lines.push({ description, quantity, unit, unitPrice, lineTotal, vatRate, vatAmount });
    }

    return {
      number: get('ID') || get('DocumentNumber') || `ISDOC-${Date.now()}`,
      type: 'received',
      supplierName: supplier.name || get('Name') || get('TradeName'),
      supplierIco: supplier.ico,
      supplierDic: supplier.dic,
      buyerName: buyer.name,
      buyerIco: buyer.ico,
      buyerDic: buyer.dic,
      description: get('Note') || get('Description') || '',
      amountBase: getNum('TaxExclusiveAmount') || getNum('TaxableAmount'),
      vatAmount: getNum('TaxAmount') || getNum('DifferenceTaxAmount'),
      amountTotal: getNum('TaxInclusiveAmount') || getNum('PayableAmount') || getNum('PaidDepositsAmount') || getNum('PayableRoundingAmount'),
      vatRate: Math.round((getNum('TaxAmount') / (getNum('TaxExclusiveAmount') || 1)) * 100) || 0,
      currency: get('CurrencyCode') || 'CZK',
      issueDate: get('IssueDate') || new Date().toISOString().slice(0, 10),
      duzp: get('TaxPointDate') || get('IssueDate') || '',
      dueDate: get('PaymentDueDate') || get('DueDate') || (() => {
        const pmMatch = xml.match(/<PaymentMeans[^>]*>([\s\S]*?)<\/PaymentMeans>/i);
        if (pmMatch) {
          const pmDue = pmMatch[1].match(/<PaymentDueDate[^>]*>([^<]+)<\/PaymentDueDate>/i);
          if (pmDue) return pmDue[1].trim();
        }
        const ptMatch = xml.match(/<PaymentTerms[^>]*>([\s\S]*?)<\/PaymentTerms>/i);
        if (ptMatch) {
          const ptDue = ptMatch[1].match(/<PaymentDueDate[^>]*>([^<]+)<\/PaymentDueDate>/i);
          if (ptDue) return ptDue[1].trim();
        }
        return '';
      })(),
      variableSymbol: get('VariableSymbol') || get('ID') || '',
      lines: lines.length > 0 ? lines : undefined,
    };
  }

  async findForResident(user: AuthUser, residentId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, tenantId: user.tenantId },
    });
    if (!resident) throw new NotFoundException('Kontakt nenalezen');

    const fullName = `${resident.firstName} ${resident.lastName}`.trim();
    const scopeWhere = await this.scope.scopeByPropertyId(user);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        ...scopeWhere,
        OR: [
          { supplierId: residentId },
          { buyerId: residentId },
          ...(fullName ? [
            { supplierName: { equals: fullName, mode: 'insensitive' as const } },
            { buyerName: { equals: fullName, mode: 'insensitive' as const } },
          ] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        property: { select: { id: true, name: true } },
      },
    });

    return invoices.map(i => ({
      ...i,
      amountBase: Number(i.amountBase),
      vatAmount: Number(i.vatAmount),
      amountTotal: Number(i.amountTotal),
      issueDate: i.issueDate.toISOString(),
      duzp: i.duzp?.toISOString() ?? null,
      dueDate: i.dueDate?.toISOString() ?? null,
      paymentDate: i.paymentDate?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
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
  <TaxPointDate>${fmtDate(invoice.duzp || invoice.issueDate)}</TaxPointDate>
  <DueDate>${fmtDate(invoice.dueDate)}</DueDate>
  <Note>${escXml(invoice.description || '')}</Note>
  <CurrencyCode>${escXml(invoice.currency || 'CZK')}</CurrencyCode>
  <AccountingSupplierParty>
    <Party>
      <PartyName><Name>${escXml(invoice.supplierName || '')}</Name></PartyName>
      <PartyIdentification><ID>${escXml(invoice.supplierIco || '')}</ID></PartyIdentification>${invoice.supplierDic ? `\n      <PartyTaxScheme><CompanyID>${escXml(invoice.supplierDic)}</CompanyID></PartyTaxScheme>` : ''}
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyName><Name>${escXml(invoice.buyerName || '')}</Name></PartyName>
      <PartyIdentification><ID>${escXml(invoice.buyerIco || '')}</ID></PartyIdentification>${invoice.buyerDic ? `\n      <PartyTaxScheme><CompanyID>${escXml(invoice.buyerDic)}</CompanyID></PartyTaxScheme>` : ''}
    </Party>
  </AccountingCustomerParty>
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
