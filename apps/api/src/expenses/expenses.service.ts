import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { ExpenseAiService } from './expense-ai.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateExpenseDto, UpdateExpenseDto, ExtractExpenseDto } from './dto/expense.dto';
import type { AuthUser } from '@ifmio/shared-types';

const FINANCE_ROLES = ['tenant_owner', 'tenant_admin', 'finance_manager'] as const;

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
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  private parseDate(value: string | undefined, fieldName: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new BadRequestException(`Neplatné datum: ${fieldName}`);
    return d;
  }

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private ai: ExpenseAiService,
  ) {}

  // ─── Number generation (retry loop for race conditions) ─────────

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    for (let attempt = 1; attempt <= 5; attempt++) {
      const count = await this.prisma.expense.count({
        where: { tenantId, number: { startsWith: prefix } },
      });
      const candidate = `${prefix}${String(count + attempt).padStart(4, '0')}`;

      const exists = await this.prisma.expense.findFirst({
        where: { tenantId, number: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    // Fallback: timestamp suffix
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }

  // ─── List ────────────────────────────────────────────────────────

  async list(user: AuthUser, query: {
    status?: string;
    category?: string;
    propertyId?: string;
    workOrderId?: string;
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
      ...(query.category ? { category: query.category } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
      ...(() => {
        const from = this.parseDate(query.dateFrom, 'dateFrom');
        const to = this.parseDate(query.dateTo, 'dateTo');
        if (from && to) return { receiptDate: { gte: from, lte: to } };
        if (from) return { receiptDate: { gte: from } };
        if (to) return { receiptDate: { lte: to } };
        return {};
      })(),
      ...(query.search ? {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' } },
          { vendor: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          property: true,
          workOrder: true,
        },
      }),
      this.prisma.expense.count({ where }),
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
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const base = { tenantId: user.tenantId, deletedAt: null, ...scopeWhere } as any;

    const [draft, submitted, approved, rejected, reimbursed, totalAmountResult] = await Promise.all([
      this.prisma.expense.count({ where: { ...base, status: 'draft' } }),
      this.prisma.expense.count({ where: { ...base, status: 'submitted' } }),
      this.prisma.expense.count({ where: { ...base, status: 'approved' } }),
      this.prisma.expense.count({ where: { ...base, status: 'rejected' } }),
      this.prisma.expense.count({ where: { ...base, status: 'reimbursed' } }),
      this.prisma.expense.aggregate({
        where: { ...base, status: { in: ['submitted', 'approved'] } },
        _sum: { amountTotal: true },
      }),
    ]);

    return {
      draft,
      submitted,
      approved,
      rejected,
      reimbursed,
      totalPending: Number(totalAmountResult._sum.amountTotal ?? 0),
    };
  }

  // ─── Get by ID ──────────────────────────────────────────────────

  async getById(user: AuthUser, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        property: true,
        workOrder: true,
      },
    });
    if (!expense) throw new NotFoundException('Vydaj nenalezen');
    await this.scope.verifyEntityAccess(user, expense.propertyId);
    return serialize(expense);
  }

  // ─── Get my expenses ────────────────────────────────────────────

  async getMyExpenses(user: AuthUser, query: {
    status?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      submittedBy: user.id,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          property: true,
          workOrder: true,
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Create ──────────────────────────────────────────────────────

  async create(user: AuthUser, dto: CreateExpenseDto) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId);
    }

    const number = await this.generateNumber(user.tenantId);

    // Get user name for submittedByName
    const userRecord = await this.prisma.user.findFirst({
      where: { id: user.id, tenantId: user.tenantId },
      select: { name: true },
    });

    const expense = await this.prisma.expense.create({
      data: {
        tenantId: user.tenantId,
        number,
        propertyId: dto.propertyId ?? null,
        workOrderId: dto.workOrderId ?? null,
        submittedBy: user.id,
        submittedByName: userRecord?.name ?? null,
        category: dto.category as any,
        description: dto.description,
        vendor: dto.vendor ?? null,
        vendorIco: dto.vendorIco ?? null,
        amount: dto.amount,
        vatRate: dto.vatRate ?? null,
        vatAmount: dto.vatAmount ?? null,
        amountTotal: dto.amountTotal,
        currency: dto.currency ?? 'CZK',
        receiptDate: new Date(dto.receiptDate),
        receiptNumber: dto.receiptNumber ?? null,
        imageBase64: dto.imageBase64 ?? null,
        mimeType: dto.mimeType ?? null,
        aiExtracted: dto.aiConfidence != null,
        aiConfidence: dto.aiConfidence ?? null,
        aiRawResponse: dto.aiRawResponse ?? undefined,
        reimbursementType: (dto.reimbursementType as any) ?? 'cash',
        status: 'draft',
      },
    });

    return this.getById(user, expense.id);
  }

  // ─── Update ──────────────────────────────────────────────────────

  async update(user: AuthUser, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Vydaj nenalezen');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Upravovat lze pouze vydaje ve stavu "navrh"');
    }
    await this.scope.verifyEntityAccess(user, existing.propertyId);

    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId);
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        propertyId: dto.propertyId ?? null,
        workOrderId: dto.workOrderId ?? null,
        category: dto.category as any,
        description: dto.description,
        vendor: dto.vendor ?? null,
        vendorIco: dto.vendorIco ?? null,
        amount: dto.amount,
        vatRate: dto.vatRate ?? null,
        vatAmount: dto.vatAmount ?? null,
        amountTotal: dto.amountTotal,
        currency: dto.currency ?? 'CZK',
        receiptDate: new Date(dto.receiptDate),
        receiptNumber: dto.receiptNumber ?? null,
        imageBase64: dto.imageBase64 ?? null,
        mimeType: dto.mimeType ?? null,
        aiExtracted: dto.aiConfidence != null,
        aiConfidence: dto.aiConfidence ?? null,
        aiRawResponse: dto.aiRawResponse ?? undefined,
        reimbursementType: (dto.reimbursementType as any) ?? existing.reimbursementType,
      },
    });

    return this.getById(user, id);
  }

  // ─── Soft delete ────────────────────────────────────────────────

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Vydaj nenalezen');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Smazat lze pouze vydaje ve stavu "navrh"');
    }
    await this.scope.verifyEntityAccess(user, existing.propertyId);

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // ─── AI Extract ─────────────────────────────────────────────────

  async extract(dto: ExtractExpenseDto) {
    // Validate size (base64 ~13.5MB max → ~10MB image)
    if (dto.imageBase64.length > 13_500_000) {
      throw new BadRequestException('Obrazek je prilis velky (max ~10 MB)');
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(dto.mimeType)) {
      throw new BadRequestException('Nepodporovany format souboru. Povoleno: JPEG, PNG');
    }

    const result = await this.ai.extractFromImage(dto.imageBase64, dto.mimeType);
    return result;
  }

  // ─── Submit ─────────────────────────────────────────────────────

  async submit(user: AuthUser, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Vydaj nenalezen');
    await this.scope.verifyEntityAccess(user, expense.propertyId);
    if (expense.status !== 'draft') {
      throw new BadRequestException('Odeslat ke schvaleni lze pouze navrh');
    }

    await this.prisma.expense.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    return this.getById(user, id);
  }

  // ─── Approve ────────────────────────────────────────────────────

  async approve(user: AuthUser, id: string) {
    if (!FINANCE_ROLES.includes(user.role as (typeof FINANCE_ROLES)[number])) {
      throw new ForbiddenException('Nemate opravneni ke schvaleni vydaju');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Vydaj nenalezen');
    await this.scope.verifyEntityAccess(user, expense.propertyId);
    if (expense.status !== 'submitted') {
      throw new BadRequestException('Schvalit lze pouze vydaj cekajici na schvaleni');
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    return this.getById(user, id);
  }

  // ─── Reject ─────────────────────────────────────────────────────

  async reject(user: AuthUser, id: string, reason: string) {
    if (!FINANCE_ROLES.includes(user.role as (typeof FINANCE_ROLES)[number])) {
      throw new ForbiddenException('Nemate opravneni k zamitnuti vydaju');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Vydaj nenalezen');
    await this.scope.verifyEntityAccess(user, expense.propertyId);
    if (expense.status !== 'submitted') {
      throw new BadRequestException('Zamitnout lze pouze vydaj cekajici na schvaleni');
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return this.getById(user, id);
  }

  // ─── Reimburse ──────────────────────────────────────────────────

  async reimburse(user: AuthUser, id: string, reimbursedAmount: number, reimbursementType?: string) {
    if (!FINANCE_ROLES.includes(user.role as (typeof FINANCE_ROLES)[number])) {
      throw new ForbiddenException('Nemate opravneni k proplaseni vydaju');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Vydaj nenalezen');
    await this.scope.verifyEntityAccess(user, expense.propertyId);
    if (expense.status !== 'approved') {
      throw new BadRequestException('Proplatit lze pouze schvaleny vydaj');
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'reimbursed',
        reimbursedAt: new Date(),
        reimbursedAmount,
        reimbursementType: (reimbursementType as any) ?? expense.reimbursementType,
      },
    });

    return this.getById(user, id);
  }
}
