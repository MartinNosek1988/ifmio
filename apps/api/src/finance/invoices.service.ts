import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceListQueryDto, MarkPaidDto, CreateAllocationDto, UpdateAllocationDto } from './dto/invoice.dto';
import type { AuthUser } from '@ifmio/shared-types';

/** Roles allowed to approve invoices */
const APPROVAL_ROLES = ['tenant_owner', 'tenant_admin', 'finance_manager'];

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async list(user: AuthUser, query: InvoiceListQueryDto) {
    const { type, isPaid, search, approvalStatus, financialContextId } = query;
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
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(financialContextId ? { financialContextId } : {}),
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
        constantSymbol: dto.constantSymbol || null,
        specificSymbol: dto.specificSymbol || null,
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
    const existing = await this.findOneInternal(user, id);
    if (existing.approvalStatus !== 'draft') {
      throw new BadRequestException('Doklad lze upravit pouze ve stavu draft');
    }

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
    if (dto.constantSymbol !== undefined) data.constantSymbol = dto.constantSymbol || null;
    if (dto.specificSymbol !== undefined) data.specificSymbol = dto.specificSymbol || null;
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
    const existing = await this.findOneInternal(user, id);
    if (existing.approvalStatus !== 'draft') {
      throw new BadRequestException('Doklad lze smazat pouze ve stavu draft');
    }
    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markPaid(user: AuthUser, id: string, dto?: MarkPaidDto) {
    const existing = await this.findOneInternal(user, id);
    if (existing.approvalStatus !== 'approved') {
      throw new BadRequestException('Doklad lze označit jako uhrazený pouze ve stavu approved');
    }

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

    await this.logAudit(user, 'INVOICE_MARK_PAID', id);

    return this.serializeInvoice(invoice);
  }

  // ─── APPROVAL WORKFLOW ───────────────────────────────────────────

  async submitInvoice(user: AuthUser, id: string) {
    const invoice = await this.findOneInternal(user, id);
    if (invoice.approvalStatus !== 'draft') {
      throw new BadRequestException('Pouze doklad ve stavu draft lze odeslat ke schválení');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'submitted',
        submittedAt: new Date(),
        submittedById: user.id,
        // Clear any previous rejection
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
    });

    await this.logAudit(user, 'INVOICE_SUBMIT', id);

    return this.serializeInvoice(updated);
  }

  async approveInvoice(user: AuthUser, id: string) {
    if (!APPROVAL_ROLES.includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění schvalovat doklady');
    }

    const invoice = await this.findOneInternal(user, id);
    if (invoice.approvalStatus !== 'submitted') {
      throw new BadRequestException('Pouze doklad ve stavu submitted lze schválit');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedById: user.id,
      },
    });

    await this.logAudit(user, 'INVOICE_APPROVE', id);

    return this.serializeInvoice(updated);
  }

  async returnInvoiceToDraft(user: AuthUser, id: string, reason?: string) {
    if (!APPROVAL_ROLES.includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění vracet doklady');
    }

    const invoice = await this.findOneInternal(user, id);
    if (invoice.approvalStatus === 'draft') {
      throw new BadRequestException('Doklad je již ve stavu draft');
    }
    if (invoice.isPaid) {
      throw new BadRequestException('Uhrazený doklad nelze vrátit do draftu');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'draft',
        rejectedAt: new Date(),
        rejectedById: user.id,
        rejectionReason: reason || null,
        // Clear approval timestamps
        approvedAt: null,
        approvedById: null,
        submittedAt: null,
        submittedById: null,
      },
    });

    await this.logAudit(user, 'INVOICE_RETURN_TO_DRAFT', id);

    return this.serializeInvoice(updated);
  }

  private serializeInvoice(invoice: any) {
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
      submittedAt: invoice.submittedAt?.toISOString() ?? null,
      approvedAt: invoice.approvedAt?.toISOString() ?? null,
      rejectedAt: invoice.rejectedAt?.toISOString() ?? null,
    };
  }

  private async logAudit(user: AuthUser, action: string, entityId: string) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action,
        entity: 'Invoice',
        entityId,
      },
    });
  }

  async pairWithTransaction(user: AuthUser, invoiceId: string, transactionId: string) {
    const existing = await this.findOneInternal(user, invoiceId);
    if (existing.approvalStatus !== 'approved') {
      throw new BadRequestException('Doklad lze párovat pouze ve stavu approved');
    }

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
    // TODO: remove debug log
    console.log('[ISDOC DEBUG] raw XML first 500 chars:', xmlContent.substring(0, 500))

    // Parse ISDOC XML to extract invoice data
    const parsed = this.parseIsdocXml(xmlContent);

    // TODO: remove debug log
    console.log('[ISDOC DEBUG] parsed result:', JSON.stringify(parsed, null, 2).substring(0, 2000))

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
    // Strip namespace prefixes for simpler parsing (isdoc:ID → ID)
    const stripped = xml.replace(/<\/?[\w-]+:/g, (m) => m[0] === '<' && m[1] === '/' ? '</' : '<');

    // Extract text content from a tag within a section
    const getFrom = (section: string, tag: string) => {
      const match = section.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return match?.[1]?.trim() || '';
    };
    const get = (tag: string) => getFrom(stripped, tag);
    const getNum = (tag: string) => parseFloat(getFrom(stripped, tag)) || 0;

    // Extract sections
    const getSection = (tag: string, source = stripped) => {
      const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return match?.[1] || '';
    };

    const supplierXml = getSection('AccountingSupplierParty');
    const buyerXml = getSection('AccountingCustomerParty');
    const paymentMeansXml = getSection('PaymentMeans');
    const legalMonetaryXml = getSection('LegalMonetaryTotal');
    const taxTotalXml = getSection('TaxTotal');

    // Parse party: IČO from PartyIdentification/ID, DIČ from PartyTaxScheme/CompanyID
    const parseParty = (section: string) => {
      const partyIdSection = getSection('PartyIdentification', section);
      const taxSchemeSection = getSection('PartyTaxScheme', section);
      return {
        name: getFrom(section, 'Name') || getFrom(section, 'TradeName'),
        ico: getFrom(partyIdSection, 'ID') || getFrom(section, 'IČ'),
        dic: getFrom(taxSchemeSection, 'CompanyID') || getFrom(section, 'TaxRegistrationID') || getFrom(section, 'DIČ'),
      };
    };

    const supplier = parseParty(supplierXml);
    const buyer = parseParty(buyerXml);

    // Document number — get ID that's a direct child of Invoice, not nested in parties
    // Remove party sections first to avoid matching their IDs
    const xmlWithoutParties = stripped
      .replace(/<AccountingSupplierParty[\s\S]*?<\/AccountingSupplierParty>/gi, '')
      .replace(/<AccountingCustomerParty[\s\S]*?<\/AccountingCustomerParty>/gi, '')
      .replace(/<PaymentMeans[\s\S]*?<\/PaymentMeans>/gi, '')
      .replace(/<TaxTotal[\s\S]*?<\/TaxTotal>/gi, '')
      .replace(/<InvoiceLine[\s\S]*?<\/InvoiceLine>/gi, '');
    const docNumber = getFrom(xmlWithoutParties, 'ID') || get('DocumentNumber') || `ISDOC-${Date.now()}`;

    // Variable symbol — search in PaymentMeans section
    const variableSymbol = getFrom(paymentMeansXml, 'VariableSymbol') || get('VariableSymbol') || '';

    // Payment method from PaymentMeansCode
    const pmCode = getFrom(paymentMeansXml, 'PaymentMeansCode');
    const paymentMethodMap: Record<string, string> = { '42': 'bank_transfer', '10': 'cash', '48': 'card' };

    // Due date — search in PaymentMeans, then PaymentTerms, then top-level DueDate
    const dueDate = getFrom(paymentMeansXml, 'PaymentDueDate')
      || getFrom(getSection('PaymentTerms'), 'PaymentDueDate')
      || get('DueDate')
      || '';

    // Amounts from LegalMonetaryTotal
    const amountBase = parseFloat(getFrom(legalMonetaryXml, 'TaxExclusiveAmount')) || getNum('TaxableAmount');
    const amountTotal = parseFloat(getFrom(legalMonetaryXml, 'PayableAmount'))
      || parseFloat(getFrom(legalMonetaryXml, 'TaxInclusiveAmount'))
      || amountBase;
    const vatAmount = parseFloat(getFrom(taxTotalXml, 'TaxAmount')) || 0;

    // VAT rate — from first InvoiceLine's ClassifiedTaxCategory/Percent, or calculated
    let vatRate = 0;
    const firstLineXml = getSection('InvoiceLine');
    if (firstLineXml) {
      vatRate = parseFloat(getFrom(firstLineXml, 'Percent')) || 0;
    }
    if (!vatRate && amountBase > 0) {
      vatRate = Math.round((vatAmount / amountBase) * 100);
    }

    // Currency from any currencyID attribute
    const currMatch = stripped.match(/currencyID="([A-Z]{3})"/i);
    const currency = currMatch?.[1] || get('CurrencyCode') || 'CZK';

    // Invoice lines
    const lines: Array<Record<string, unknown>> = [];
    const lineRegex = /<InvoiceLine[^>]*>([\s\S]*?)<\/InvoiceLine>/gi;
    let lineMatch: RegExpExecArray | null;
    let lineIdx = 0;
    while ((lineMatch = lineRegex.exec(stripped)) !== null) {
      const l = lineMatch[1];
      const description = getFrom(l, 'Name') || getFrom(l, 'Description') || getFrom(l, 'Note') || `Položka ${++lineIdx}`;
      const quantity = parseFloat(getFrom(l, 'InvoicedQuantity')) || 1;
      const unit = getFrom(l, 'unitCode') || 'ks';
      const unitPrice = parseFloat(getFrom(l, 'PriceAmount')) || 0;
      const lineTotal = parseFloat(getFrom(l, 'LineExtensionAmount')) || quantity * unitPrice;
      const lineVatRate = parseFloat(getFrom(l, 'Percent')) || 0;
      const lineVatAmount = Math.round(lineTotal * lineVatRate / 100 * 100) / 100;
      lines.push({ description, quantity, unit, unitPrice, lineTotal, vatRate: lineVatRate, vatAmount: lineVatAmount });
    }

    return {
      number: docNumber,
      type: 'received',
      supplierName: supplier.name,
      supplierIco: supplier.ico,
      supplierDic: supplier.dic,
      buyerName: buyer.name,
      buyerIco: buyer.ico,
      buyerDic: buyer.dic,
      description: get('Note') || get('Description') || '',
      amountBase,
      vatAmount,
      amountTotal,
      vatRate,
      currency,
      issueDate: get('IssueDate') || new Date().toISOString().slice(0, 10),
      duzp: get('TaxPointDate') || get('IssueDate') || '',
      dueDate,
      variableSymbol,
      ...(pmCode && paymentMethodMap[pmCode] ? { paymentMethod: paymentMethodMap[pmCode] } : {}),
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

  // ─── ALLOCATION CRUD ──────────────────────────────────────────

  async getAllocations(user: AuthUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const rows = await this.prisma.invoiceCostAllocation.findMany({
      where: { invoiceId },
      include: { component: { select: { id: true, name: true, componentType: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      vatRate: r.vatRate != null ? Number(r.vatRate) : null,
      vatAmount: r.vatAmount != null ? Number(r.vatAmount) : null,
      consumption: r.consumption != null ? Number(r.consumption) : null,
    }))
  }

  async getAllocationSummary(user: AuthUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const allocations = await this.getAllocations(user, invoiceId)
    const allocatedAmount = allocations.reduce((s, a) => s + a.amount, 0)
    const totalAmount = Number(invoice.amountTotal)

    return {
      totalAmount,
      allocatedAmount: Math.round(allocatedAmount * 100) / 100,
      remainingAmount: Math.round((totalAmount - allocatedAmount) * 100) / 100,
      allocationStatus: invoice.allocationStatus,
      allocations,
    }
  }

  async createAllocation(user: AuthUser, invoiceId: string, dto: CreateAllocationDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')
    if (invoice.approvalStatus !== 'draft') throw new BadRequestException('Alokace lze měnit pouze u dokladů ve stavu Draft')

    const component = await this.prisma.prescriptionComponent.findFirst({ where: { id: dto.componentId, tenantId: user.tenantId, propertyId: invoice.propertyId! } })
    if (!component) throw new BadRequestException('Složka předpisu nenalezena nebo nepatří k této nemovitosti')

    const row = await this.prisma.invoiceCostAllocation.create({
      data: {
        invoiceId,
        componentId: dto.componentId,
        amount: new Decimal(dto.amount),
        vatRate: dto.vatRate != null ? new Decimal(dto.vatRate) : null,
        vatAmount: dto.vatAmount != null ? new Decimal(dto.vatAmount) : null,
        year: dto.year,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : null,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : null,
        consumption: dto.consumption != null ? new Decimal(dto.consumption) : null,
        consumptionUnit: dto.consumptionUnit,
        targetOwnerId: dto.targetOwnerId,
        unitIds: dto.unitIds ?? [],
        note: dto.note,
      },
      include: { component: { select: { id: true, name: true, componentType: true } } },
    })

    await this.recalculateAllocationStatus(invoiceId)
    return { ...row, amount: Number(row.amount), vatRate: row.vatRate != null ? Number(row.vatRate) : null, vatAmount: row.vatAmount != null ? Number(row.vatAmount) : null, consumption: row.consumption != null ? Number(row.consumption) : null }
  }

  async updateAllocation(user: AuthUser, invoiceId: string, allocationId: string, dto: UpdateAllocationDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')
    if (invoice.approvalStatus !== 'draft') throw new BadRequestException('Alokace lze měnit pouze u dokladů ve stavu Draft')

    const existing = await this.prisma.invoiceCostAllocation.findFirst({ where: { id: allocationId, invoiceId } })
    if (!existing) throw new NotFoundException('Alokace nenalezena')

    if (dto.componentId) {
      const component = await this.prisma.prescriptionComponent.findFirst({ where: { id: dto.componentId, tenantId: user.tenantId, propertyId: invoice.propertyId! } })
      if (!component) throw new BadRequestException('Složka předpisu nenalezena nebo nepatří k této nemovitosti')
    }

    const data: Record<string, unknown> = {}
    if (dto.componentId !== undefined) data.componentId = dto.componentId
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount)
    if (dto.vatRate !== undefined) data.vatRate = dto.vatRate != null ? new Decimal(dto.vatRate) : null
    if (dto.vatAmount !== undefined) data.vatAmount = dto.vatAmount != null ? new Decimal(dto.vatAmount) : null
    if (dto.year !== undefined) data.year = dto.year
    if (dto.periodFrom !== undefined) data.periodFrom = dto.periodFrom ? new Date(dto.periodFrom) : null
    if (dto.periodTo !== undefined) data.periodTo = dto.periodTo ? new Date(dto.periodTo) : null
    if (dto.consumption !== undefined) data.consumption = dto.consumption != null ? new Decimal(dto.consumption) : null
    if (dto.consumptionUnit !== undefined) data.consumptionUnit = dto.consumptionUnit
    if (dto.targetOwnerId !== undefined) data.targetOwnerId = dto.targetOwnerId
    if (dto.unitIds !== undefined) data.unitIds = dto.unitIds
    if (dto.note !== undefined) data.note = dto.note

    const row = await this.prisma.invoiceCostAllocation.update({
      where: { id: allocationId },
      data,
      include: { component: { select: { id: true, name: true, componentType: true } } },
    })

    await this.recalculateAllocationStatus(invoiceId)
    return { ...row, amount: Number(row.amount), vatRate: row.vatRate != null ? Number(row.vatRate) : null, vatAmount: row.vatAmount != null ? Number(row.vatAmount) : null, consumption: row.consumption != null ? Number(row.consumption) : null }
  }

  async deleteAllocation(user: AuthUser, invoiceId: string, allocationId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')
    if (invoice.approvalStatus !== 'draft') throw new BadRequestException('Alokace lze měnit pouze u dokladů ve stavu Draft')

    const existing = await this.prisma.invoiceCostAllocation.findFirst({ where: { id: allocationId, invoiceId } })
    if (!existing) throw new NotFoundException('Alokace nenalezena')

    await this.prisma.invoiceCostAllocation.delete({ where: { id: allocationId } })
    await this.recalculateAllocationStatus(invoiceId)
  }

  private async recalculateAllocationStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId } })
    if (!invoice) return

    const [costAgg, evidAgg] = await Promise.all([
      this.prisma.invoiceCostAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } }),
      this.prisma.evidenceFolderAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } }),
    ])
    const allocated = (costAgg._sum.amount ? Number(costAgg._sum.amount) : 0) + (evidAgg._sum.amount ? Number(evidAgg._sum.amount) : 0)
    const total = Number(invoice.amountTotal)

    let status = 'unallocated'
    if (allocated > 0 && allocated < total) status = 'partial'
    else if (allocated >= total) status = 'allocated'

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { allocationStatus: status },
    })
  }
}
