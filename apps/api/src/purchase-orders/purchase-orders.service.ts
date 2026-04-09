import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { EmailService } from '../email/email.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import type { AuthUser } from '@ifmio/shared-types';

const APPROVAL_ROLES = ['tenant_owner', 'tenant_admin', 'finance_manager'] as const;

/** Convert Decimal fields to numbers, dates to ISO strings */
function serialize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Decimal) return Number(obj) as unknown as T;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serialize) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serialize(value);
    }
    return result as T;
  }
  return obj;
}

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private email: EmailService,
  ) {}

  // ─── Number generation ───────────────────────────────────────────

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { tenantId, number: { startsWith: `PO-${year}-` } },
    });
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── List ────────────────────────────────────────────────────────

  async list(user: AuthUser, query: {
    status?: string;
    matchStatus?: string;
    supplierId?: string;
    propertyId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...scopeWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.matchStatus ? { matchStatus: query.matchStatus } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.dateFrom ? { createdAt: { gte: new Date(query.dateFrom) } } : {}),
      ...(query.dateTo ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), lte: new Date(query.dateTo) } } : {}),
      ...(query.search ? {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' } },
          { supplierName: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          property: true,
          supplier: true,
          items: { orderBy: { position: 'asc' } },
          invoices: true,
          _count: { select: { items: true, invoices: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Stats ───────────────────────────────────────────────────────

  async stats(user: AuthUser) {
    const base = { tenantId: user.tenantId, deletedAt: null };

    const [totalOpen, pendingApproval, awaitingInvoice, matched, totalAmountResult] = await Promise.all([
      this.prisma.purchaseOrder.count({
        where: { ...base, status: { in: ['draft', 'pending_approval', 'approved', 'sent'] } },
      }),
      this.prisma.purchaseOrder.count({
        where: { ...base, status: 'pending_approval' },
      }),
      this.prisma.purchaseOrder.count({
        where: { ...base, status: 'sent', matchStatus: { not: 'matched' } },
      }),
      this.prisma.purchaseOrder.count({
        where: { ...base, matchStatus: 'matched' },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { ...base, status: { in: ['draft', 'pending_approval', 'approved', 'sent'] } },
        _sum: { amountTotal: true },
      }),
    ]);

    return {
      totalOpen,
      pendingApproval,
      awaitingInvoice,
      matched,
      totalAmount: Number(totalAmountResult._sum.amountTotal ?? 0),
    };
  }

  // ─── Get by ID ───────────────────────────────────────────────────

  async getById(user: AuthUser, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        property: true,
        supplier: true,
        items: { orderBy: { position: 'asc' } },
        invoices: true,
      },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');
    await this.scope.verifyEntityAccess(user, po.propertyId);
    return serialize(po);
  }

  // ─── Create ──────────────────────────────────────────────────────

  async create(user: AuthUser, dto: CreatePurchaseOrderDto) {
    const number = await this.generateNumber(user.tenantId);
    const vatRate = dto.vatRate ?? 0;
    const currency = dto.currency ?? 'CZK';

    const amountBase = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const vatAmount = Math.round(amountBase * (vatRate / 100) * 100) / 100;
    const amountTotal = Math.round((amountBase + vatAmount) * 100) / 100;

    const po = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          tenantId: user.tenantId,
          number,
          propertyId: dto.propertyId ?? null,
          financialContextId: dto.financialContextId ?? null,
          supplierId: dto.supplierId ?? null,
          supplierName: dto.supplierName,
          supplierIco: dto.supplierIco ?? null,
          supplierDic: dto.supplierDic ?? null,
          supplierEmail: dto.supplierEmail ?? null,
          sourceType: (dto.sourceType ?? 'manual') as any,
          sourceId: dto.sourceId ?? null,
          description: dto.description ?? null,
          deliveryAddress: dto.deliveryAddress ?? null,
          vatRate,
          currency,
          amountBase,
          vatAmount,
          amountTotal,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          status: 'draft',
          matchStatus: 'unmatched',
          createdBy: user.id,
        },
      });

      if (dto.items.length > 0) {
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((item, idx) => ({
            purchaseOrderId: created.id,
            position: idx + 1,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
            catalogCode: item.catalogCode ?? null,
          })),
        });
      }

      return created;
    });

    return this.getById(user, po.id);
  }

  // ─── Update ──────────────────────────────────────────────────────

  async update(user: AuthUser, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Objednavka nenalezena');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Upravovat lze pouze objednavky ve stavu "navrh"');
    }
    await this.scope.verifyEntityAccess(user, existing.propertyId);

    const vatRate = dto.vatRate ?? 0;
    const currency = dto.currency ?? 'CZK';
    const amountBase = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const vatAmount = Math.round(amountBase * (vatRate / 100) * 100) / 100;
    const amountTotal = Math.round((amountBase + vatAmount) * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          propertyId: dto.propertyId ?? null,
          financialContextId: dto.financialContextId ?? null,
          supplierId: dto.supplierId ?? null,
          supplierName: dto.supplierName,
          supplierIco: dto.supplierIco ?? null,
          supplierDic: dto.supplierDic ?? null,
          supplierEmail: dto.supplierEmail ?? null,
          sourceType: (dto.sourceType ?? 'manual') as any,
          sourceId: dto.sourceId ?? null,
          description: dto.description ?? null,
          deliveryAddress: dto.deliveryAddress ?? null,
          vatRate,
          currency,
          amountBase,
          vatAmount,
          amountTotal,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        },
      });

      if (dto.items.length > 0) {
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((item, idx) => ({
            purchaseOrderId: id,
            position: idx + 1,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
            catalogCode: item.catalogCode ?? null,
          })),
        });
      }
    });

    return this.getById(user, id);
  }

  // ─── Soft delete ─────────────────────────────────────────────────

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Objednavka nenalezena');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Smazat lze pouze objednavky ve stavu "navrh"');
    }
    await this.scope.verifyEntityAccess(user, existing.propertyId);

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // ─── Workflow transitions ────────────────────────────────────────

  async submit(user: AuthUser, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');
    if (po.status !== 'draft') {
      throw new BadRequestException('Odeslat ke schvaleni lze pouze navrh');
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'pending_approval' },
    });

    return this.getById(user, id);
  }

  async approve(user: AuthUser, id: string) {
    if (!APPROVAL_ROLES.includes(user.role as (typeof APPROVAL_ROLES)[number])) {
      throw new ForbiddenException('Nemate opravneni ke schvaleni objednavek');
    }

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');
    if (po.status !== 'pending_approval') {
      throw new BadRequestException('Schvalit lze pouze objednavku cekajici na schvaleni');
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    return this.getById(user, id);
  }

  async send(user: AuthUser, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { property: true, items: { orderBy: { position: 'asc' } } },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');
    if (po.status !== 'approved') {
      throw new BadRequestException('Odeslat dodavateli lze pouze schvalenou objednavku');
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });

    // Send email to supplier
    if (po.supplierEmail) {
      const issueDate = new Date().toLocaleDateString('cs-CZ');
      const deliveryDate = po.deliveryDate
        ? new Date(po.deliveryDate).toLocaleDateString('cs-CZ')
        : 'dle dohody';
      const currency = po.currency ?? 'CZK';

      const itemsRows = po.items
        .map(
          (item, idx) =>
            `<tr>
              <td style="padding:4px 8px;border:1px solid #ddd">${idx + 1}</td>
              <td style="padding:4px 8px;border:1px solid #ddd">${item.description}</td>
              <td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${item.quantity} ${item.unit}</td>
              <td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${Number(item.unitPrice).toLocaleString('cs-CZ')} ${currency}</td>
              <td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${Number(item.totalPrice).toLocaleString('cs-CZ')} ${currency}</td>
            </tr>`,
        )
        .join('\n');

      const html = `
        <p>Vazeni,</p>
        <p>zasilame objednavku c. <strong>${po.number}</strong> ze dne ${issueDate}.</p>
        <p>Pozadovany termin dodani: <strong>${deliveryDate}</strong></p>

        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:4px 8px;border:1px solid #ddd">#</th>
              <th style="padding:4px 8px;border:1px solid #ddd">Popis</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Mnozstvi</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Jedn. cena</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Celkem</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <p><strong>Celkova castka: ${Number(po.amountTotal).toLocaleString('cs-CZ')} ${currency}</strong></p>

        <p>V pripade dotazu odpovezte na tento email.</p>
      `;

      try {
        await this.email.send({
          to: po.supplierEmail,
          subject: `Objednavka ${po.number} — ${po.property?.name ?? ''}`.trim(),
          html,
        });
      } catch (err) {
        this.logger.error(`Chyba pri odesilani emailu objednavky ${po.number}: ${err}`);
      }
    }

    return this.getById(user, id);
  }

  async cancel(user: AuthUser, id: string, reason: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');
    if (po.status === 'cancelled') {
      throw new BadRequestException('Objednavka je jiz zrusena');
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    return this.getById(user, id);
  }

  // ─── Invoice matching ───────────────────────────────────────────

  async matchInvoice(user: AuthUser, poId: string, invoiceId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Faktura nenalezena');

    // Link invoice to PO
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { purchaseOrderId: poId },
    });

    // Compare amounts
    const poAmount = Number(po.amountTotal);
    const invoiceAmount = Number(invoice.amountTotal);
    const difference = Math.abs(poAmount - invoiceAmount);
    const tolerance = 0.01;

    const matchStatus = difference <= tolerance ? 'matched' : 'partial';

    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { matchStatus },
    });

    // Auto-submit invoice if matched and still draft
    if (matchStatus === 'matched' && invoice.approvalStatus === 'draft') {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { approvalStatus: 'submitted', submittedAt: new Date(), submittedById: user.id },
      });
    }

    return {
      matchStatus,
      amountDifference: Math.round(difference * 100) / 100,
    };
  }

  async unmatchInvoice(user: AuthUser, poId: string, invoiceId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Objednavka nenalezena');

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId, purchaseOrderId: poId },
    });
    if (!invoice) throw new NotFoundException('Faktura neni prirazena k teto objednavce');

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { purchaseOrderId: null },
    });

    // Recalculate matchStatus — check if other invoices remain linked
    const remaining = await this.prisma.invoice.count({
      where: { purchaseOrderId: poId, deletedAt: null },
    });

    const matchStatus = remaining > 0 ? 'partial' : 'unmatched';
    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { matchStatus },
    });

    return { matchStatus };
  }

  // ─── Create from Work Order ──────────────────────────────────────

  async createFromWorkOrder(user: AuthUser, workOrderId: string, dto: CreatePurchaseOrderDto) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: user.tenantId },
      include: { supplier: true },
    });
    if (!wo) throw new NotFoundException('Pracovni prikaz nenalezen');

    const mergedDto: CreatePurchaseOrderDto = {
      ...dto,
      propertyId: dto.propertyId ?? wo.propertyId ?? undefined,
      description: dto.description ?? wo.title,
      supplierId: dto.supplierId ?? wo.supplierId ?? undefined,
      supplierName: dto.supplierName ?? wo.supplier?.displayName ?? '',
      supplierIco: dto.supplierIco ?? wo.supplier?.ic ?? undefined,
      supplierDic: dto.supplierDic ?? wo.supplier?.dic ?? undefined,
      supplierEmail: dto.supplierEmail ?? wo.supplier?.email ?? undefined,
      sourceType: 'work_order',
      sourceId: workOrderId,
      items: dto.items?.length
        ? dto.items
        : wo.totalCost
          ? [{ description: wo.title, unit: 'ks', quantity: 1, unitPrice: Number(wo.totalCost) }]
          : [],
    };

    return this.create(user, mergedDto);
  }

  // ─── Create from Helpdesk Ticket ─────────────────────────────────

  async createFromTicket(user: AuthUser, ticketId: string, dto: CreatePurchaseOrderDto) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId },
    });
    if (!ticket) throw new NotFoundException('Ticket nenalezen');

    const mergedDto: CreatePurchaseOrderDto = {
      ...dto,
      propertyId: dto.propertyId ?? ticket.propertyId ?? undefined,
      description: dto.description ?? ticket.title,
      sourceType: 'helpdesk',
      sourceId: ticketId,
    };

    return this.create(user, mergedDto);
  }
}
