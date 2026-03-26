import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { LocalStorageProvider } from '../documents/storage/local.storage';
import { Decimal } from '@prisma/client/runtime/library';
import QRCode from 'qrcode';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceListQueryDto, MarkPaidDto, CreateAllocationDto, UpdateAllocationDto } from './dto/invoice.dto';
import type { AuthUser } from '@ifmio/shared-types';

/** Roles allowed to approve invoices */
const APPROVAL_ROLES = ['tenant_owner', 'tenant_admin', 'finance_manager'];

interface BulkImportItem {
  xmlContent: string
  pdfBase64?: string
  pdfFileName?: string
  isdocFileName: string
}

@Injectable()
export class InvoicesService {
  private anthropic: Anthropic | null = null

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private storage: LocalStorageProvider,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (apiKey) this.anthropic = new Anthropic({ apiKey })
  }

  async list(user: AuthUser, query: InvoiceListQueryDto) {
    const { type, isPaid, search, approvalStatus, financialContextId,
      supplier, buyer, number: numFilter, variableSymbol,
      issueDateFrom, issueDateTo, dueDateFrom, dueDateTo, allocationStatus } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...scopeWhere,
      ...(type ? { type } : {}),
      ...(isPaid !== undefined && isPaid !== '' ? { isPaid: isPaid === 'true' } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(financialContextId ? { financialContextId } : {}),
      ...(allocationStatus ? { allocationStatus } : {}),
      ...(supplier ? { supplierName: { contains: supplier, mode: 'insensitive' } } : {}),
      ...(buyer ? { buyerName: { contains: buyer, mode: 'insensitive' } } : {}),
      ...(numFilter ? { number: { contains: numFilter, mode: 'insensitive' } } : {}),
      ...(variableSymbol ? { variableSymbol: { contains: variableSymbol, mode: 'insensitive' } } : {}),
      ...(issueDateFrom ? { issueDate: { ...(issueDateFrom ? { gte: new Date(issueDateFrom) } : {}), ...(issueDateTo ? { lte: new Date(issueDateTo) } : {}) } } : {}),
      ...(!issueDateFrom && issueDateTo ? { issueDate: { lte: new Date(issueDateTo) } } : {}),
      ...(dueDateFrom ? { dueDate: { ...(dueDateFrom ? { gte: new Date(dueDateFrom) } : {}), ...(dueDateTo ? { lte: new Date(dueDateTo) } : {}) } } : {}),
      ...(!dueDateFrom && dueDateTo ? { dueDate: { lte: new Date(dueDateTo) } } : {}),
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

  async getOne(user: AuthUser, id: string) {
    const invoice = await this.findOneInternal(user, id);
    return this.serializeInvoice(invoice);
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
        paymentIban: dto.paymentIban || null,
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
    if (dto.paymentIban !== undefined) data.paymentIban = dto.paymentIban || null;
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

  async getDocuments(user: AuthUser, invoiceId: string) {
    await this.findOneInternal(user, invoiceId)
    const links = await this.prisma.documentLink.findMany({
      where: { entityType: 'invoice', entityId: invoiceId },
      include: { document: { select: { id: true, name: true, originalName: true, mimeType: true, size: true, storageKey: true, createdAt: true } } },
    })
    return links.map(l => l.document)
  }

  async getPaymentQr(user: AuthUser, id: string, size = 200): Promise<{ qrString: string | null; qrDataUrl: string | null }> {
    const invoice = await this.findOneInternal(user, id)
    const iban = invoice.paymentIban
    const total = Number(invoice.amountTotal)

    if (!iban || total <= 0) return { qrString: null, qrDataUrl: null }

    const parts = ['SPD*1.0', `ACC:${iban.replace(/\s/g, '')}`, `AM:${total.toFixed(2)}`, `CC:${invoice.currency || 'CZK'}`]
    const msg = `Faktura ${invoice.number}`.slice(0, 60)
    parts.push(`MSG:${msg}`)
    if (invoice.variableSymbol) parts.push(`X-VS:${invoice.variableSymbol}`)
    if (invoice.constantSymbol) parts.push(`X-KS:${invoice.constantSymbol}`)
    if (invoice.specificSymbol) parts.push(`X-SS:${invoice.specificSymbol}`)

    const qrString = parts.join('*')
    const qrDataUrl = await QRCode.toDataURL(qrString, { width: size, margin: 1 })
    return { qrString, qrDataUrl }
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
    // TODO: remove after diagnosis
    console.log('[ISDOC INPUT TYPE]', typeof xmlContent, 'length:', xmlContent?.length ?? 'N/A')
    console.log('[ISDOC INPUT SAMPLE]', (xmlContent ?? '').substring(0, 200))

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

  async importIsdocBulk(user: AuthUser, items: BulkImportItem[]) {
    const results: Array<{ isdocFileName: string; success: boolean; invoiceId?: string; number?: string; error?: string }> = []

    for (const item of items) {
      try {
        const invoice = await this.importIsdoc(user, item.xmlContent)

        // Store PDF attachment if provided
        if (item.pdfBase64 && item.pdfFileName) {
          const pdfBuffer = Buffer.from(item.pdfBase64, 'base64')
          const key = `${user.tenantId}/${crypto.randomUUID()}.pdf`
          await this.storage.save(pdfBuffer, key, 'application/pdf')
          const doc = await this.prisma.document.create({
            data: {
              tenantId: user.tenantId,
              name: item.pdfFileName,
              originalName: item.pdfFileName,
              mimeType: 'application/pdf',
              size: pdfBuffer.length,
              storageKey: key,
              storageType: 'local',
              category: 'invoice',
              createdById: user.id,
              links: { create: [{ entityType: 'invoice', entityId: invoice.id }] },
            },
          })
        }

        results.push({ isdocFileName: item.isdocFileName, success: true, invoiceId: invoice.id, number: invoice.number })
      } catch (e: any) {
        results.push({ isdocFileName: item.isdocFileName, success: false, error: e.message || 'Neznámá chyba' })
      }
    }

    return {
      results,
      created: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    }
  }

  private static readonly MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
    'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
    'claude-opus-4-6': { input: 5.00, output: 25.00 },
  }
  private static readonly USD_CZK_RATE = 23.0

  async extractFromPdf(user: AuthUser, pdfBase64: string, fileName?: string) {
    if (!this.anthropic) throw new BadRequestException('AI extrakce není dostupná — ANTHROPIC_API_KEY není nastaven')
    if (pdfBase64.length > 10 * 1024 * 1024) throw new BadRequestException('PDF je příliš velké (max ~7.5 MB)')

    // Load top-5 supplier patterns for few-shot context
    const patterns = await this.prisma.supplierExtractionPattern.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { usageCount: 'desc' },
      take: 5,
    })

    let fewShotSection = ''
    if (patterns.length > 0) {
      fewShotSection = '\n\nVzory z předchozích faktur v systému:\n'
      for (const pattern of patterns) {
        fewShotSection += `\nDodavatel ${pattern.supplierName ?? pattern.supplierIco} (IČO: ${pattern.supplierIco}):\n`
        const examples = pattern.fieldExamples as Record<string, string>
        for (const [field, val] of Object.entries(examples)) {
          fewShotSection += `  - ${field}: ${val}\n`
        }
        if (pattern.hints) {
          fewShotSection += `  Poznámka: ${pattern.hints}\n`
        }
      }
      fewShotSection += '\nPokud faktura pochází od některého z těchto dodavatelů, použij tyto vzory jako referenci pro formát a hodnoty polí.'
    }

    const modelId = 'claude-haiku-4-5-20251001'
    let response: any
    try {
      response = await this.anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: `Jsi expert na extrakci dat z českých faktur.
Extrahuj strukturovaná data z faktury a vrať POUZE validní JSON objekt.
Pokud pole není na faktuře uvedeno, vrať null pro dané pole.
Číselné hodnoty vrať jako čísla (ne stringy).
Data vrať ve formátu YYYY-MM-DD.
IČO je 8místné číslo bez mezer. DIČ začíná "CZ" + IČO.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: `Extrahuj data z této faktury a vrať JSON:
{"number":null,"supplierName":null,"supplierIco":null,"supplierDic":null,"buyerName":null,"buyerIco":null,"buyerDic":null,"description":null,"amountBase":null,"vatAmount":null,"amountTotal":null,"vatRate":null,"issueDate":null,"duzp":null,"dueDate":null,"variableSymbol":null,"constantSymbol":null,"specificSymbol":null,"paymentIban":null,"currency":"CZK","paymentMethod":null}
Vrať POUZE JSON, žádný jiný text.${fewShotSection}` },
          ],
        }],
      })
    } catch (e: any) {
      await this.prisma.aiExtractionLog.create({
        data: { tenantId: user.tenantId, model: modelId, inputTokens: 0, outputTokens: 0, costUsd: 0, confidence: 'low', fileName, success: false, createdBy: user.id },
      })
      throw new BadRequestException('AI extrakce selhala: ' + (e.message || 'neznámá chyba'))
    }

    const inputTokens = response.usage?.input_tokens ?? 0
    const outputTokens = response.usage?.output_tokens ?? 0
    const pricing = InvoicesService.MODEL_PRICING[modelId] ?? { input: 1.00, output: 5.00 }
    const costUsd = (inputTokens / 1e6) * pricing.input + (outputTokens / 1e6) * pricing.output

    const textBlock = response.content.find((c: any) => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      await this.prisma.aiExtractionLog.create({
        data: { tenantId: user.tenantId, model: modelId, inputTokens, outputTokens, costUsd, confidence: 'low', fileName, success: false, createdBy: user.id },
      })
      throw new BadRequestException('Nepodařilo se extrahovat data z PDF')
    }

    let extracted: Record<string, unknown>
    try {
      extracted = JSON.parse(textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    } catch {
      await this.prisma.aiExtractionLog.create({
        data: { tenantId: user.tenantId, model: modelId, inputTokens, outputTokens, costUsd, confidence: 'low', fileName, success: false, createdBy: user.id },
      })
      throw new BadRequestException('Nepodařilo se parsovat výstup AI')
    }

    const keyFields = ['number', 'supplierName', 'amountTotal', 'issueDate', 'variableSymbol']
    const filled = keyFields.filter(k => extracted[k] != null && extracted[k] !== '').length
    const confidence = filled >= 4 ? 'high' : filled >= 2 ? 'medium' : 'low'

    await this.prisma.aiExtractionLog.create({
      data: { tenantId: user.tenantId, model: modelId, inputTokens, outputTokens, costUsd, confidence, fileName, success: true, createdBy: user.id },
    })

    // Update usage count if extracted supplier matches a known pattern
    const extractedIco = typeof extracted.supplierIco === 'string' ? extracted.supplierIco : null
    if (extractedIco) {
      await this.prisma.supplierExtractionPattern.updateMany({
        where: { tenantId: user.tenantId, supplierIco: extractedIco },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      })
    }

    return { extracted, confidence, usage: { inputTokens, outputTokens, costUsd } }
  }

  async getAiExtractionStats(user: AuthUser, period: 'month' | 'year' | 'all' = 'month') {
    const now = new Date()
    let dateFilter: Date | undefined
    if (period === 'month') dateFilter = new Date(now.getFullYear(), now.getMonth(), 1)
    else if (period === 'year') dateFilter = new Date(now.getFullYear(), 0, 1)

    const where: any = { tenantId: user.tenantId }
    if (dateFilter) where.createdAt = { gte: dateFilter }

    const logs = await this.prisma.aiExtractionLog.findMany({ where, orderBy: { createdAt: 'desc' } })

    const totalExtractions = logs.length
    const successfulExtractions = logs.filter(l => l.success).length
    const totalInputTokens = logs.reduce((s, l) => s + l.inputTokens, 0)
    const totalOutputTokens = logs.reduce((s, l) => s + l.outputTokens, 0)
    const totalCostUsd = logs.reduce((s, l) => s + Number(l.costUsd), 0)
    const totalCostCzk = totalCostUsd * InvoicesService.USD_CZK_RATE

    const byConfidence = { high: 0, medium: 0, low: 0 }
    for (const l of logs) if (l.confidence in byConfidence) byConfidence[l.confidence as keyof typeof byConfidence]++

    const modelMap = new Map<string, { count: number; costUsd: number; tokens: number }>()
    for (const l of logs) {
      const m = modelMap.get(l.model) ?? { count: 0, costUsd: 0, tokens: 0 }
      m.count++
      m.costUsd += Number(l.costUsd)
      m.tokens += l.inputTokens + l.outputTokens
      modelMap.set(l.model, m)
    }

    return {
      totalExtractions, successfulExtractions,
      totalInputTokens, totalOutputTokens,
      totalCostUsd: Math.round(totalCostUsd * 1e6) / 1e6,
      totalCostCzk: Math.round(totalCostCzk * 100) / 100,
      avgCostPerInvoice: successfulExtractions > 0 ? Math.round((totalCostCzk / successfulExtractions) * 100) / 100 : 0,
      byConfidence,
      byModel: Array.from(modelMap.entries()).map(([model, v]) => ({ model, count: v.count, costUsd: Math.round(v.costUsd * 1e6) / 1e6, tokens: v.tokens })),
    }
  }

  // ─── SUPPLIER EXTRACTION PATTERNS ──────────────────────────────

  async saveExtractionPattern(
    user: AuthUser,
    invoiceId: string,
    originalExtracted: Record<string, any>,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null },
    })
    if (!invoice) throw new NotFoundException('Faktura nenalezena')
    if (!invoice.supplierIco) return { saved: false, reason: 'no_supplier_ico' }

    // Build fieldExamples from the final invoice (user-corrected values)
    const importantFields = [
      'variableSymbol', 'vatRate', 'constantSymbol',
      'specificSymbol', 'paymentIban', 'description',
    ] as const
    const fieldExamples: Record<string, string> = {}
    for (const field of importantFields) {
      const val = invoice[field]
      if (val != null && val !== '') {
        fieldExamples[field] = String(val)
      }
    }

    // Build hints from user corrections
    let hints: string | null = null
    const corrections: string[] = []
    for (const key of Object.keys(fieldExamples)) {
      const origVal = originalExtracted[key]
      const finalVal = fieldExamples[key]
      if (finalVal && String(finalVal) !== String(origVal ?? '')) {
        corrections.push(`Pole "${key}" má správnou hodnotu "${finalVal}"`)
      }
    }
    if (corrections.length > 0) {
      hints = corrections.join('. ')
    }

    // Upsert — merge fieldExamples with existing
    const existing = await this.prisma.supplierExtractionPattern.findUnique({
      where: { tenantId_supplierIco: { tenantId: user.tenantId, supplierIco: invoice.supplierIco } },
    })

    const mergedExamples = existing
      ? { ...(existing.fieldExamples as Record<string, string>), ...fieldExamples }
      : fieldExamples

    await this.prisma.supplierExtractionPattern.upsert({
      where: { tenantId_supplierIco: { tenantId: user.tenantId, supplierIco: invoice.supplierIco } },
      create: {
        tenantId: user.tenantId,
        supplierIco: invoice.supplierIco,
        supplierName: invoice.supplierName ?? undefined,
        fieldExamples: mergedExamples,
        hints,
        usageCount: 0,
      },
      update: {
        supplierName: invoice.supplierName ?? undefined,
        fieldExamples: mergedExamples,
        ...(hints ? { hints } : {}),
        updatedAt: new Date(),
      },
    })

    return { saved: true, supplierIco: invoice.supplierIco, corrections: corrections.length }
  }

  async listExtractionPatterns(user: AuthUser) {
    return this.prisma.supplierExtractionPattern.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { usageCount: 'desc' },
    })
  }

  async deleteExtractionPattern(user: AuthUser, supplierIco: string) {
    const pattern = await this.prisma.supplierExtractionPattern.findUnique({
      where: { tenantId_supplierIco: { tenantId: user.tenantId, supplierIco } },
    })
    if (!pattern) throw new NotFoundException('Vzor nenalezen')
    await this.prisma.supplierExtractionPattern.delete({
      where: { id: pattern.id },
    })
  }

  async exportIsdoc(user: AuthUser, id: string): Promise<string> {
    const invoice = await this.findOneInternal(user, id);

    // If we have stored ISDOC XML, return it
    if (invoice.isdocXml) return invoice.isdocXml;

    // Generate ISDOC XML
    return this.generateIsdocXml(invoice);
  }

  private parseIsdocXml(xmlString: string): Record<string, unknown> {
    // Validate input
    if (!xmlString || typeof xmlString !== 'string') {
      return { number: `ISDOC-${Date.now()}`, type: 'received', issueDate: new Date().toISOString().slice(0, 10) }
    }

    // Strip XML declaration + namespace prefixes (isdoc:ID → ID)
    let s = xmlString.replace(/<\?xml[^?]*\?>/g, '').trim()
    s = s.replace(/<(\/?)[a-zA-Z][a-zA-Z0-9]*:/g, '<$1')

    // Helpers
    const extractSection = (src: string, tag: string): string => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      return src.match(re)?.[1] ?? ''
    }
    const extractValue = (src: string, tag: string): string => {
      const re = new RegExp(`<${tag}[^>]*>([^<]+)<\\/${tag}>`, 'i')
      return src.match(re)?.[1]?.trim() ?? ''
    }
    const num = (src: string, tag: string) => parseFloat(extractValue(src, tag)) || 0

    // Document number — from root level only (strip nested blocks to avoid ID collisions)
    const rootOnly = s
      .replace(/<AccountingSupplierParty[\s\S]*?<\/AccountingSupplierParty>/gi, '')
      .replace(/<AccountingCustomerParty[\s\S]*?<\/AccountingCustomerParty>/gi, '')
      .replace(/<PaymentMeans[\s\S]*?<\/PaymentMeans>/gi, '')
      .replace(/<TaxTotal[\s\S]*?<\/TaxTotal>/gi, '')
      .replace(/<TaxSubTotal[\s\S]*?<\/TaxSubTotal>/gi, '')
      .replace(/<InvoiceLine[\s\S]*?<\/InvoiceLine>/gi, '')
      .replace(/<TaxScheme[\s\S]*?<\/TaxScheme>/gi, '')
    const docNumber = extractValue(rootOnly, 'ID') || extractValue(s, 'DocumentNumber') || `ISDOC-${Date.now()}`

    // Supplier
    const supplierSection = extractSection(s, 'AccountingSupplierParty')
    const supplierName = extractValue(supplierSection, 'Name') || extractValue(supplierSection, 'TradeName')
    const supplierIco = extractValue(extractSection(supplierSection, 'PartyIdentification'), 'ID')
    const supplierDic = extractValue(extractSection(supplierSection, 'PartyTaxScheme'), 'CompanyID')

    // Buyer
    const buyerSection = extractSection(s, 'AccountingCustomerParty')
    const buyerName = extractValue(buyerSection, 'Name') || extractValue(buyerSection, 'TradeName')
    const buyerIco = extractValue(extractSection(buyerSection, 'PartyIdentification'), 'ID')
    const buyerDic = extractValue(extractSection(buyerSection, 'PartyTaxScheme'), 'CompanyID')

    // Amounts from LegalMonetaryTotal
    const monetarySection = extractSection(s, 'LegalMonetaryTotal')
    const amountBase = num(monetarySection, 'TaxExclusiveAmount')
    const amountTotal = num(monetarySection, 'PayableAmount') || num(monetarySection, 'TaxInclusiveAmount') || amountBase

    // VAT
    const taxSection = extractSection(s, 'TaxTotal')
    const vatAmount = num(taxSection, 'TaxAmount')
    let vatRate = num(extractSection(taxSection, 'TaxSubTotal'), 'Percent')
      || num(extractSection(s, 'InvoiceLine'), 'Percent')
    if (!vatRate && amountBase > 0) vatRate = Math.round((vatAmount / amountBase) * 100)

    // Dates (return strings — CreateInvoiceDto uses @IsDateString)
    const issueDate = extractValue(rootOnly, 'IssueDate') || extractValue(s, 'IssueDate') || new Date().toISOString().slice(0, 10)
    const taxPointDate = extractValue(rootOnly, 'TaxPointDate') || extractValue(s, 'TaxPointDate')

    // Payment means
    const paymentSection = extractSection(s, 'PaymentMeans')
    const variableSymbol = extractValue(paymentSection, 'VariableSymbol')
    const dueDate = extractValue(paymentSection, 'PaymentDueDate') || extractValue(paymentSection, 'DueDate')
      || extractValue(extractSection(s, 'PaymentTerms'), 'PaymentDueDate') || extractValue(s, 'DueDate')
    const pmCode = extractValue(paymentSection, 'PaymentMeansCode')
    const pmMap: Record<string, string> = { '42': 'bank_transfer', '10': 'cash', '48': 'card' }

    // Description
    const description = extractValue(rootOnly, 'Note') || extractValue(rootOnly, 'Description') || ''

    // Currency
    const currency = extractValue(rootOnly, 'LocalCurrencyCode') || s.match(/currencyID="([A-Z]{3})"/i)?.[1] || extractValue(s, 'CurrencyCode') || 'CZK'

    // Invoice lines
    const lines: Array<Record<string, unknown>> = []
    const lineRegex = /<InvoiceLine[^>]*>([\s\S]*?)<\/InvoiceLine>/gi
    let lineMatch: RegExpExecArray | null
    let lineIdx = 0
    while ((lineMatch = lineRegex.exec(s)) !== null) {
      const l = lineMatch[1]
      const lineDesc = extractValue(l, 'Name') || extractValue(l, 'Description') || extractValue(l, 'Note') || `Položka ${++lineIdx}`
      const quantity = parseFloat(extractValue(l, 'InvoicedQuantity')) || 1
      const unit = extractValue(l, 'unitCode') || 'ks'
      const unitPrice = num(l, 'PriceAmount')
      const lineTotal = num(l, 'LineExtensionAmount') || quantity * unitPrice
      const lineVatRate = num(l, 'Percent')
      const lineVatAmount = Math.round(lineTotal * lineVatRate / 100 * 100) / 100
      lines.push({ description: lineDesc, quantity, unit, unitPrice, lineTotal, vatRate: lineVatRate, vatAmount: lineVatAmount })
    }

    const result = {
      number: docNumber,
      type: 'received',
      supplierName, supplierIco, supplierDic,
      buyerName, buyerIco, buyerDic,
      description,
      amountBase, vatAmount, amountTotal, vatRate, currency,
      issueDate,
      duzp: taxPointDate || issueDate,
      dueDate: dueDate || '',
      variableSymbol,
      ...(pmCode && pmMap[pmCode] ? { paymentMethod: pmMap[pmCode] } : {}),
      lines: lines.length > 0 ? lines : undefined,
    }

    return result
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

  // ─── COPY / RECURRING / TYPE / NUMBER / TAGS / HISTORY ────────

  async copyInvoice(user: AuthUser, id: string) {
    const src = await this.findOneInternal(user, id)

    const created = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId: user.tenantId, propertyId: src.propertyId,
          number: `${src.number}-COPY`, type: src.type,
          supplierName: src.supplierName, supplierIco: src.supplierIco, supplierDic: src.supplierDic,
          buyerName: src.buyerName, buyerIco: src.buyerIco, buyerDic: src.buyerDic,
          description: src.description, amountBase: src.amountBase, vatRate: src.vatRate,
          vatAmount: src.vatAmount, amountTotal: src.amountTotal, currency: src.currency,
          issueDate: src.issueDate, duzp: src.duzp, dueDate: src.dueDate,
          variableSymbol: src.variableSymbol, constantSymbol: src.constantSymbol, specificSymbol: src.specificSymbol,
          lines: src.lines as any, note: src.note, tags: src.tags,
          approvalStatus: 'draft', isPaid: false,
          supplierId: src.supplierId, buyerId: src.buyerId,
        },
      })

      const allocs = await tx.invoiceCostAllocation.findMany({ where: { invoiceId: id } })
      if (allocs.length > 0) {
        await tx.invoiceCostAllocation.createMany({
          data: allocs.map(({ id: _, invoiceId: __, createdAt: ___, ...rest }) => ({ ...rest, invoiceId: invoice.id })),
        })
      }

      const evidAllocs = await tx.evidenceFolderAllocation.findMany({ where: { invoiceId: id } })
      if (evidAllocs.length > 0) {
        await tx.evidenceFolderAllocation.createMany({
          data: evidAllocs.map(({ id: _, invoiceId: __, createdAt: ___, ...rest }) => ({ ...rest, invoiceId: invoice.id })),
        })
      }

      return invoice
    })

    await this.recalculateAllocationStatus(created.id)
    return this.serializeInvoice(created)
  }

  async copyRecurring(user: AuthUser, id: string, period: 'monthly' | 'quarterly', count: number) {
    if (period !== 'monthly' && period !== 'quarterly') throw new BadRequestException('Neplatná perioda opakování')
    if (!Number.isFinite(count) || !Number.isInteger(count)) throw new BadRequestException('Počet opakování musí být celé číslo')
    const maxCount = period === 'monthly' ? 12 : 4
    if (count < 1 || count > maxCount) throw new BadRequestException(period === 'monthly' ? 'Počet opakování musí být 1–12' : 'Počet čtvrtletních opakování musí být 1–4')
    const src = await this.findOneInternal(user, id)
    const months = period === 'monthly' ? 1 : 3
    const created: any[] = []

    for (let i = 1; i <= count; i++) {
      const offsetMs = months * i
      const newIssue = new Date(src.issueDate)
      newIssue.setMonth(newIssue.getMonth() + offsetMs)
      const newDue = src.dueDate ? new Date(src.dueDate) : null
      if (newDue) newDue.setMonth(newDue.getMonth() + offsetMs)

      const inv = await this.prisma.invoice.create({
        data: {
          tenantId: user.tenantId, propertyId: src.propertyId,
          number: `${src.number}-${String(i).padStart(2, '0')}`,
          type: src.type,
          supplierName: src.supplierName, supplierIco: src.supplierIco, supplierDic: src.supplierDic,
          buyerName: src.buyerName, buyerIco: src.buyerIco, buyerDic: src.buyerDic,
          description: src.description, amountBase: src.amountBase, vatRate: src.vatRate,
          vatAmount: src.vatAmount, amountTotal: src.amountTotal, currency: src.currency,
          issueDate: newIssue, duzp: newIssue, dueDate: newDue,
          variableSymbol: src.variableSymbol, constantSymbol: src.constantSymbol,
          specificSymbol: src.specificSymbol, lines: src.lines as any,
          note: src.note, tags: src.tags,
          approvalStatus: 'draft', isPaid: false,
          supplierId: src.supplierId, buyerId: src.buyerId,
        },
      })
      created.push(this.serializeInvoice(inv))
    }
    return { created, count: created.length }
  }

  async changeType(user: AuthUser, id: string, type: string) {
    const inv = await this.findOneInternal(user, id)
    if (inv.approvalStatus !== 'draft') throw new BadRequestException('Typ lze měnit pouze u draft dokladů')
    const updated = await this.prisma.invoice.update({ where: { id }, data: { type: type as any } })
    return this.serializeInvoice(updated)
  }

  async changeNumber(user: AuthUser, id: string, number: string) {
    const inv = await this.findOneInternal(user, id)
    if (inv.approvalStatus !== 'draft') throw new BadRequestException('Číslo lze měnit pouze u draft dokladů')
    const updated = await this.prisma.invoice.update({ where: { id }, data: { number } })
    return this.serializeInvoice(updated)
  }

  async addTag(user: AuthUser, id: string, tag: string) {
    const inv = await this.findOneInternal(user, id)
    if (inv.tags.length >= 20) throw new BadRequestException('Maximálně 20 štítků na doklad')
    if (inv.tags.includes(tag)) return this.serializeInvoice(inv)
    const updated = await this.prisma.invoice.update({ where: { id }, data: { tags: { push: tag } } })
    return this.serializeInvoice(updated)
  }

  async removeTag(user: AuthUser, id: string, tag: string) {
    const inv = await this.findOneInternal(user, id)
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { tags: { set: inv.tags.filter(t => t !== tag) } },
    })
    return this.serializeInvoice(updated)
  }

  async getHistory(user: AuthUser, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')
    // TODO: implement audit log query when AuditLog model supports entity filtering
    return []
  }

}
