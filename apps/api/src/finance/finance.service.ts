import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as iconv from 'iconv-lite';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { KontoService } from '../konto/konto.service';
import { EmailService } from '../email/email.service';
import { PdfService } from '../pdf/pdf.service';
import type { PrescriptionPdfData } from '../pdf/pdf.service';
import * as QRCode from 'qrcode';
import type { Prisma } from '@prisma/client';
import { parseCsv } from './parsers/csv.parser';
import { parseAbo } from './parsers/abo.parser';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private konto: KontoService,
    private email: EmailService,
    private pdf: PdfService,
  ) {}

  // ─── BANK ACCOUNTS ────────────────────────────────────────────

  async listBankAccounts(user: AuthUser, financialContextId?: string) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...scopeWhere,
        ...(financialContextId ? { financialContextId } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });
    // SECURITY: strip apiToken from response — never expose to frontend (Wave 3)
    return accounts.map(({ apiToken: _, ...safe }) => safe);
  }

  async createBankAccount(user: AuthUser, dto: {
    name: string;
    accountNumber: string;
    iban?: string;
    bankCode?: string;
    currency?: string;
    propertyId?: string;
    financialContextId?: string;
  }) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId);
    }

    // Resolve financialContextId — required since M3
    let financialContextId = dto.financialContextId;
    if (!financialContextId) {
      // Find existing FC for property or tenant
      const fc = await this.prisma.financialContext.findFirst({
        where: {
          tenantId: user.tenantId,
          ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
          isActive: true,
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (fc) {
        financialContextId = fc.id;
      } else {
        // Auto-create or find default FC for this tenant (covers new tenants / test environments)
        const defaultFc = await this.prisma.financialContext.upsert({
          where: { tenantId_code: { tenantId: user.tenantId, code: 'DEFAULT' } },
          create: {
            tenantId: user.tenantId,
            scopeType: 'manager',
            code: 'DEFAULT',
            displayName: 'Výchozí finanční kontext',
            currency: 'CZK',
            isActive: true,
          },
          update: {},
        });
        financialContextId = defaultFc.id;
      }
    }

    return this.prisma.bankAccount.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        bankCode: dto.bankCode,
        currency: dto.currency ?? 'CZK',
        propertyId: dto.propertyId,
        financialContextId,
      },
    });
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────

  async listTransactions(
    user: AuthUser,
    query: {
      bankAccountId?: string;
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      financialContextId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { bankAccountId, status, type, dateFrom, dateTo, financialContextId } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    // BankTransaction → bankAccount.propertyId
    const scopeWhere = await this.scope.scopeByRelation(user, 'bankAccount');
    const where: Prisma.BankTransactionWhereInput = {
      tenantId: user.tenantId,
      ...scopeWhere,
      ...(bankAccountId ? { bankAccountId } : {}),
      ...(financialContextId ? { bankAccount: { financialContextId } } : {}),
      ...(status ? { status: status as Prisma.EnumBankTransactionStatusFilter } : {}),
      ...(type ? { type: type as Prisma.EnumBankTransactionTypeFilter } : {}),
      ...(dateFrom || dateTo ? {
        date: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip,
        include: {
          bankAccount: { select: { id: true, name: true } },
          prescription: { select: { id: true, description: true, variableSymbol: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      data: items.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createTransaction(user: AuthUser, dto: {
    bankAccountId: string;
    amount: number;
    type: 'credit' | 'debit';
    date: string;
    counterparty?: string;
    counterpartyIban?: string;
    variableSymbol?: string;
    specificSymbol?: string;
    constantSymbol?: string;
    description?: string;
  }) {
    // Verify bank account access
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, tenantId: user.tenantId },
    });
    if (!bankAccount) throw new NotFoundException('Bankovní účet nenalezen');
    await this.scope.verifyEntityAccess(user, bankAccount.propertyId);

    return this.prisma.bankTransaction.create({
      data: {
        tenantId: user.tenantId,
        bankAccountId: dto.bankAccountId,
        amount: dto.amount,
        type: dto.type,
        date: new Date(dto.date),
        counterparty: dto.counterparty,
        counterpartyIban: dto.counterpartyIban,
        variableSymbol: dto.variableSymbol,
        specificSymbol: dto.specificSymbol,
        constantSymbol: dto.constantSymbol,
        description: dto.description,
      },
    });
  }

  // ─── PRESCRIPTIONS ────────────────────────────────────────────

  async getPrescription(user: AuthUser, id: string) {
    const p = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: { include: { component: { select: { id: true, name: true, componentType: true, calculationMethod: true } } } },
        property: { select: { id: true, name: true, ico: true, address: true, city: true, postalCode: true, legalMode: true, isVatPayer: true } },
        unit: { select: { id: true, name: true, knDesignation: true, area: true, commonAreaShare: true, disposition: true, spaceType: true } },
        resident: { select: { id: true, firstName: true, lastName: true, email: true, correspondenceAddress: true, correspondenceCity: true, companyName: true, isLegalEntity: true } },
      },
    })
    if (!p) throw new NotFoundException('Předpis nenalezen')
    return {
      ...p,
      amount: Number(p.amount),
      vatAmount: Number(p.vatAmount),
      items: p.items.map(i => ({ ...i, amount: Number(i.amount), quantity: Number(i.quantity) })),
    }
  }

  async listPrescriptions(user: AuthUser, query: {
    propertyId?: string;
    residentId?: string;
    status?: string;
    type?: string;
    financialContextId?: string;
    page?: number;
    limit?: number;
  }) {
    const { propertyId, residentId, status = 'active', type, financialContextId } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where: Prisma.PrescriptionWhereInput = {
      tenantId: user.tenantId,
      status: status as Prisma.EnumPrescriptionStatusFilter,
      ...scopeWhere,
      ...(type ? { type: type as Prisma.EnumPrescriptionTypeFilter } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(residentId ? { residentId } : {}),
      ...(financialContextId ? { financialContextId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          items: true,
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: items.map((p) => ({
        ...p,
        amount: Number(p.amount),
        vatAmount: Number(p.vatAmount),
        items: p.items.map((i) => ({ ...i, amount: Number(i.amount), quantity: Number(i.quantity) })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createPrescription(user: AuthUser, dto: {
    propertyId: string;
    unitId?: string;
    residentId?: string;
    billingPeriodId?: string;
    type: 'advance' | 'service' | 'rent' | 'other';
    amount: number;
    vatRate?: number;
    vatAmount?: number;
    dueDay?: number;
    variableSymbol?: string;
    description: string;
    source?: string;
    validFrom: string;
    validTo?: string;
    items?: { name: string; amount: number; vatRate?: number; unit?: string; quantity?: number }[];
  }) {
    await this.scope.verifyPropertyAccess(user, dto.propertyId);
    const { items, ...data } = dto;
    const prescription = await this.prisma.prescription.create({
      data: {
        tenantId: user.tenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        residentId: data.residentId,
        billingPeriodId: data.billingPeriodId,
        type: data.type,
        amount: data.amount,
        vatRate: data.vatRate ?? 0,
        vatAmount: data.vatAmount ?? 0,
        dueDay: data.dueDay ?? 15,
        variableSymbol: data.variableSymbol,
        description: data.description,
        source: data.source ?? 'MANUAL',
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        items: items?.length
          ? { create: items.map(i => ({
              name: i.name,
              amount: i.amount,
              vatRate: i.vatRate ?? 0,
              unit: i.unit,
              quantity: i.quantity ?? 1,
            })) }
          : undefined,
      },
      include: { items: true },
    });

    // Auto-post to konto: DEBIT (increases owed)
    if (data.unitId && data.residentId) {
      try {
        const account = await this.konto.getOrCreateAccount(user.tenantId, data.propertyId, data.unitId, data.residentId)
        const entry = await this.konto.postDebit(
          account.id, data.amount, 'PRESCRIPTION', prescription.id,
          `Předpis: ${data.description}`, new Date(data.validFrom),
        )
        await this.prisma.prescription.update({ where: { id: prescription.id }, data: { ledgerEntryId: entry.id } })
      } catch (err) {
        this.logger.error(`Auto-posting prescription ${prescription.id} to konto failed: ${err}`)
      }
    }

    return prescription;
  }

  // ─── BILLING PERIODS ──────────────────────────────────────────

  async listBillingPeriods(user: AuthUser, propertyId?: string) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    return this.prisma.billingPeriod.findMany({
      where: {
        tenantId: user.tenantId,
        ...scopeWhere,
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: { dateFrom: 'desc' },
      include: {
        _count: { select: { prescriptions: true } },
      },
    });
  }

  async createBillingPeriod(user: AuthUser, dto: {
    propertyId: string;
    name: string;
    dateFrom: string;
    dateTo: string;
  }) {
    await this.scope.verifyPropertyAccess(user, dto.propertyId);
    return this.prisma.billingPeriod.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        name: dto.name,
        dateFrom: new Date(dto.dateFrom),
        dateTo: new Date(dto.dateTo),
      },
    });
  }

  // ─── SUMMARY ──────────────────────────────────────────────────

  async getSummary(user: AuthUser, propertyId?: string) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const baseWhere = {
      tenantId: user.tenantId,
      ...scopeWhere,
      ...(propertyId ? { propertyId } : {}),
    };

    // For transactions, scope via bankAccount relation
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount');
    const txBaseWhere = {
      tenantId: user.tenantId,
      ...txScopeWhere,
    };

    const [
      totalTransactions,
      unmatchedCount,
      activePrescriptions,
      openBillingPeriods,
    ] = await Promise.all([
      this.prisma.bankTransaction.aggregate({
        where: txBaseWhere as any,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.bankTransaction.count({
        where: { ...txBaseWhere, status: 'unmatched' } as any,
      }),
      this.prisma.prescription.count({
        where: { ...baseWhere, status: 'active' } as any,
      }),
      this.prisma.billingPeriod.count({
        where: { ...baseWhere, status: 'open' } as any,
      }),
    ]);

    return {
      totalTransactions: totalTransactions._count,
      totalVolume: Number(totalTransactions._sum.amount ?? 0),
      unmatchedCount,
      activePrescriptions,
      openBillingPeriods,
    };
  }

  // ─── IMPORT TRANSAKCÍ ─────────────────────────────────────────

  async importTransactions(
    user: AuthUser,
    bankAccountId: string,
    file: { buffer: Buffer; originalname: string },
  ) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId: user.tenantId },
    })
    if (!bankAccount) throw new NotFoundException('Bankovní účet nenalezen')
    await this.scope.verifyEntityAccess(user, bankAccount.propertyId)

    const content  = this.decodeBuffer(file.buffer)
    const fileName = file.originalname.toLowerCase()

    const format = fileName.endsWith('.abo') || fileName.endsWith('.bbf') || fileName.endsWith('.gpc')
      ? 'abo' : 'csv'

    const parsed = format === 'abo'
      ? parseAbo(content)
      : parseCsv(content)

    const importLog = await this.prisma.importLog.create({
      data: {
        tenantId:      user.tenantId,
        bankAccountId,
        format:        format as any,
        fileName:      file.originalname,
        totalRows:     parsed.transactions.length + parsed.errors.length,
        status:        'processing',
        createdById:   user.id,
      },
    })

    let imported = 0
    let skipped  = 0
    const errors: any[] = [...parsed.errors]

    for (const tx of parsed.transactions) {
      try {
        const exists = await this.prisma.bankTransaction.findFirst({
          where: {
            tenantId:       user.tenantId,
            bankAccountId,
            date:           new Date(tx.date),
            amount:         tx.amount,
            variableSymbol: tx.variableSymbol ?? null,
          },
        })

        if (exists) {
          skipped++
          continue
        }

        await this.prisma.bankTransaction.create({
          data: {
            tenantId:            user.tenantId,
            bankAccountId,
            date:                new Date(tx.date),
            amount:              tx.amount,
            type:                tx.type,
            counterparty:        tx.counterparty || null,
            variableSymbol:      tx.variableSymbol || null,
            specificSymbol:      tx.specificSymbol ?? null,
            constantSymbol:      tx.constantSymbol ?? null,
            counterpartyAccount: tx.counterpartyAccount ?? null,
            counterpartyBankCode: tx.counterpartyBankCode ?? null,
            counterpartyIban:    tx.counterpartyIban ?? null,
            messageForRecipient: tx.messageForRecipient ?? null,
            description:         tx.description || null,
            importSource:        format,
            status:              'unmatched',
          },
        })
        imported++
      } catch (err: any) {
        errors.push({ message: err.message })
      }
    }

    const finalLog = await this.prisma.importLog.update({
      where: { id: importLog.id },
      data:  {
        importedRows: imported,
        skippedRows:  skipped,
        errorRows:    errors.length - parsed.errors.length,
        status:       errors.length > imported ? 'failed' : 'done',
        errors:       errors.length ? errors : undefined,
      },
    })

    return {
      importLogId:  finalLog.id,
      format,
      totalRows:    parsed.transactions.length,
      imported,
      skipped,
      parseErrors:  parsed.errors.length,
      status:       finalLog.status,
    }
  }

  // ─── ENCODING DETECTION ──────────────────────────────────────

  private decodeBuffer(buffer: Buffer): string {
    // UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return buffer.toString('utf-8')
    }

    // Try UTF-8 — check for replacement characters indicating invalid sequences
    const utf8 = buffer.toString('utf-8')
    if (!utf8.includes('\uFFFD')) {
      return utf8
    }

    // Heuristic: check for common Czech Windows-1250 byte values
    // ě=0xEC, š=0x9A, č=0xE8, ř=0xF8, ž=0x9E, ů=0xF9, ú=0xFA, á=0xE1, í=0xED
    const w1250Markers = [0xEC, 0x9A, 0xE8, 0xF8, 0x9E, 0xF9, 0xFA, 0xE1, 0xED]
    let w1250Score = 0
    for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
      if (w1250Markers.includes(buffer[i])) w1250Score++
    }

    if (w1250Score >= 2) {
      return iconv.decode(buffer, 'win1250')
    }

    return utf8
  }

  // ─── PÁROVÁNÍ TRANSAKCÍ ───────────────────────────────────────

  async matchTransactions(user: AuthUser, bankAccountId?: string) {
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount')
    const where: any = {
      tenantId: user.tenantId,
      status:   'unmatched',
      type:     'credit',
      ...txScopeWhere,
      ...(bankAccountId ? { bankAccountId } : {}),
    }

    const prescriptionScope = await this.scope.scopeByPropertyId(user)
    const [transactions, prescriptions] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: { bankAccount: { select: { propertyId: true } } },
      }),
      this.prisma.prescription.findMany({
        where:   { tenantId: user.tenantId, status: 'active', ...prescriptionScope } as any,
        include: { items: true },
        orderBy: { validFrom: 'asc' },
      }),
    ])

    // Load property match strategies
    const propertyIds = [...new Set(prescriptions.map(p => p.propertyId))]
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, matchStrategy: true },
    })
    const strategyMap = new Map(properties.map(p => [p.id, p.matchStrategy]))

    let matched   = 0
    let unmatched = 0
    const results: any[] = []
    const matchedPrescriptionIds = new Set<string>()

    for (const tx of transactions) {
      const txAmount = Number(tx.amount)
      let remaining = txAmount
      const txPropertyId = (tx as any).bankAccount?.propertyId
      const propertyStrategy = txPropertyId ? strategyMap.get(txPropertyId) : 'OLDEST_FIRST'

      // Find matching prescriptions by VS
      let candidates = tx.variableSymbol
        ? prescriptions.filter(p => p.variableSymbol === tx.variableSymbol && !matchedPrescriptionIds.has(p.id))
        : []

      // Fallback: if no VS match, try amount match for EXACT_AMOUNT strategy
      if (candidates.length === 0 && propertyStrategy === 'EXACT_AMOUNT') {
        candidates = prescriptions.filter(p =>
          Math.abs(Number(p.amount) - txAmount) < 0.01 && !matchedPrescriptionIds.has(p.id),
        )
      }

      // Sort candidates by strategy
      if (propertyStrategy === 'SAME_MONTH' && tx.date) {
        const txMonth = tx.date.getMonth()
        const txYear = tx.date.getFullYear()
        candidates.sort((a, b) => {
          const aMatch = a.validFrom.getMonth() === txMonth && a.validFrom.getFullYear() === txYear ? 0 : 1
          const bMatch = b.validFrom.getMonth() === txMonth && b.validFrom.getFullYear() === txYear ? 0 : 1
          return aMatch - bMatch || a.validFrom.getTime() - b.validFrom.getTime()
        })
      }
      // OLDEST_FIRST is already sorted by validFrom: 'asc'

      if (candidates.length === 0) { unmatched++; continue }

      // Chain matching: match to multiple prescriptions if amount covers more than one
      const matchedItems: { prescriptionId: string; amount: number }[] = []
      for (const p of candidates) {
        if (remaining <= 0) break
        const prescriptionAmount = Number(p.amount)
        const matchAmount = Math.min(remaining, prescriptionAmount)
        matchedItems.push({ prescriptionId: p.id, amount: matchAmount })
        matchedPrescriptionIds.add(p.id)
        remaining -= prescriptionAmount
      }

      if (matchedItems.length > 0) {
        // Match to the first (primary) prescription
        const primaryMatch = matchedItems[0]
        await this.scope.verifyPropertyAccess(user, candidates[0].propertyId)

        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: {
            status: remaining >= 0 ? 'matched' : 'partially_matched',
            prescriptionId: primaryMatch.prescriptionId,
          },
        })

        // Auto-post to konto
        const primaryP = candidates.find(c => c.id === primaryMatch.prescriptionId)
        if (primaryP?.unitId && primaryP?.residentId) {
          try {
            const account = await this.konto.getOrCreateAccount(
              user.tenantId, primaryP.propertyId, primaryP.unitId, primaryP.residentId,
            )
            const entry = await this.konto.postCredit(account.id, txAmount, 'BANK_TRANSACTION', tx.id, `Platba ${tx.variableSymbol ?? 'bez VS'}`, tx.date)
            await this.prisma.bankTransaction.update({ where: { id: tx.id }, data: { ledgerEntryId: entry.id } })
          } catch (err) {
            this.logger.error(`Auto-posting match ${tx.id} to konto failed: ${err}`)
          }
        }

        matched++
        results.push({
          transactionId: tx.id,
          prescriptions: matchedItems,
          strategy: tx.variableSymbol ? 'vs_match' : 'amount_match',
          chainMatched: matchedItems.length > 1,
        })
      } else {
        unmatched++
      }
    }

    return { total: transactions.length, matched, unmatched, results }
  }

  // ─── GENEROVÁNÍ PŘEDPISŮ ──────────────────────────────────────

  async generatePrescriptions(
    user: AuthUser,
    dto: {
      propertyId:  string
      month:       string      // YYYY-MM format
      dueDay?:     number
      amount?:     number      // fallback částka
    }
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, tenantId: user.tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')
    await this.scope.verifyPropertyAccess(user, dto.propertyId)

    const dueDay = dto.dueDay ?? 15
    const [year, month] = dto.month.split('-').map(Number)

    // Načti obsazené jednotky s residenty
    const units = await this.prisma.unit.findMany({
      where: { propertyId: dto.propertyId, isOccupied: true },
      include: {
        residents: {
          where: { isActive: true },
          take: 1,
        },
      },
    })

    const created: any[] = []
    const skipped: any[] = []

    const validFrom = new Date(year, month - 1, 1)
    const validTo   = new Date(year, month, 0) // poslední den měsíce

    for (const unit of units) {
      const resident = unit.residents[0]
      if (!resident) {
        skipped.push({ unitId: unit.id, reason: 'no_resident' })
        continue
      }

      // Deduplikace: předpis pro tuto jednotku v tomto měsíci
      const exists = await this.prisma.prescription.findFirst({
        where: {
          tenantId:   user.tenantId,
          unitId:     unit.id,
          propertyId: dto.propertyId,
          validFrom:  { gte: validFrom, lte: validTo },
        },
      })
      if (exists) {
        skipped.push({ unitId: unit.id, reason: 'already_exists' })
        continue
      }

      const amount = dto.amount ?? 0
      if (amount <= 0) {
        skipped.push({ unitId: unit.id, reason: 'no_amount' })
        continue
      }

      // VS: YYYYMM + unit name padded
      const unitNum = unit.name.replace(/\D/g, '').padStart(4, '0')
      const vs = `${year}${String(month).padStart(2, '0')}${unitNum}`

      const prescription = await this.prisma.prescription.create({
        data: {
          tenantId:       user.tenantId,
          propertyId:     dto.propertyId,
          unitId:         unit.id,
          residentId:     resident.id,
          type:           'rent',
          status:         'active',
          amount,
          dueDay,
          variableSymbol: vs,
          description:    `Nájemné ${unit.name} ${month}/${year}`,
          validFrom,
          validTo,
          items: {
            create: [{
              name:     `Nájemné ${month}/${year}`,
              amount,
              quantity: 1,
            }],
          },
        },
        include: { items: true },
      })

      // Auto-post to konto: DEBIT
      try {
        const account = await this.konto.getOrCreateAccount(user.tenantId, dto.propertyId, unit.id, resident.id)
        const entry = await this.konto.postDebit(account.id, amount, 'PRESCRIPTION', prescription.id, `Předpis ${unit.name} ${month}/${year}`, validFrom)
        await this.prisma.prescription.update({ where: { id: prescription.id }, data: { ledgerEntryId: entry.id } })
      } catch (err) {
        this.logger.error(`Auto-posting bulk prescription ${prescription.id} to konto failed: ${err}`)
      }

      created.push({
        prescriptionId: prescription.id,
        unitId:         unit.id,
        residentId:     resident.id,
        amount,
        variableSymbol: vs,
      })
    }

    return {
      propertyId: dto.propertyId,
      month:      dto.month,
      total:      units.length,
      created:    created.length,
      skipped:    skipped.length,
      details:    { created, skipped },
    }
  }

  // ─── MANUÁLNÍ PÁROVÁNÍ 1:1 ─────────────────────────────────

  async matchSingle(
    user: AuthUser,
    transactionId: string,
    prescriptionId: string,
  ) {
    const [tx, prescription] = await Promise.all([
      this.prisma.bankTransaction.findFirst({
        where: { id: transactionId, tenantId: user.tenantId },
        include: { bankAccount: { select: { propertyId: true } } },
      }),
      this.prisma.prescription.findFirst({
        where: { id: prescriptionId, tenantId: user.tenantId },
      }),
    ])

    if (!tx)           throw new NotFoundException('Transakce nenalezena')
    if (!prescription) throw new NotFoundException('Předpis nenalezen')

    // Verify scope on both entities
    await this.scope.verifyEntityAccess(user, tx.bankAccount?.propertyId ?? null)
    await this.scope.verifyEntityAccess(user, prescription.propertyId)

    if (tx.status === 'matched') {
      throw new BadRequestException('Transakce je již spárována')
    }

    const updated = await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        status:         'matched',
        prescriptionId: prescriptionId,
      },
    })

    // Auto-post to konto: CREDIT (decreases owed)
    if (prescription.unitId && prescription.residentId) {
      try {
        const account = await this.konto.getOrCreateAccount(
          user.tenantId, prescription.propertyId, prescription.unitId, prescription.residentId,
        )
        const entry = await this.konto.postCredit(
          account.id, Number(tx.amount), 'BANK_TRANSACTION', tx.id,
          `Platba ${tx.variableSymbol ?? 'bez VS'}`, tx.date,
        )
        await this.prisma.bankTransaction.update({ where: { id: tx.id }, data: { ledgerEntryId: entry.id } })
      } catch (err) {
        this.logger.error(`Auto-posting payment ${tx.id} to konto failed: ${err}`)
      }
    }

    return updated
  }

  // ─── DELETE ──────────────────────────────────────────────────

  async deletePrescription(user: AuthUser, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!prescription) throw new NotFoundException('Předpis nenalezen')
    await this.scope.verifyPropertyAccess(user, prescription.propertyId)

    // Reversal: post CREDIT to cancel the DEBIT
    if (prescription.ledgerEntryId) {
      try {
        const entry = await this.prisma.ledgerEntry.findUnique({ where: { id: prescription.ledgerEntryId } })
        if (entry) {
          await this.konto.postCredit(entry.accountId, Number(entry.amount), 'MANUAL_ADJUSTMENT', id, `Storno předpisu: ${prescription.description}`)
        }
        await this.prisma.prescription.update({ where: { id }, data: { ledgerEntryId: null } })
      } catch (err) {
        this.logger.error(`Reversal for prescription ${id} failed: ${err}`)
      }
    }

    // AUDIT: soft delete — set status to cancelled, items preserved for audit trail (Wave 2)
    await this.prisma.prescription.update({ where: { id }, data: { status: 'cancelled' } })
  }

  async unmatchTransaction(user: AuthUser, transactionId: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId, status: 'matched' },
      include: { bankAccount: { select: { propertyId: true } } },
    })
    if (!tx) throw new NotFoundException('Spárovaná transakce nenalezena')
    await this.scope.verifyEntityAccess(user, tx.bankAccount?.propertyId ?? null)

    // Revert match
    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { status: 'unmatched', prescriptionId: null, ledgerEntryId: null },
    })

    // Reversal: post DEBIT to cancel the CREDIT
    if (tx.ledgerEntryId) {
      try {
        const entry = await this.prisma.ledgerEntry.findUnique({ where: { id: tx.ledgerEntryId } })
        if (entry) {
          await this.konto.postDebit(entry.accountId, Number(entry.amount), 'MANUAL_ADJUSTMENT', transactionId, `Storno platby ${tx.variableSymbol ?? transactionId}`)
        }
      } catch (err) {
        this.logger.error(`Reversal for unmatch ${transactionId} failed: ${err}`)
      }
    }

    return { unmatched: true, transactionId }
  }

  async deleteTransaction(user: AuthUser, id: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bankAccount: { select: { propertyId: true } } },
    })
    if (!tx) throw new NotFoundException('Transakce nenalezena')
    await this.scope.verifyEntityAccess(user, tx.bankAccount?.propertyId ?? null)

    // AUDIT: soft delete — set status to ignored, preserved for audit trail (Wave 2)
    await this.prisma.bankTransaction.update({ where: { id }, data: { status: 'ignored' } })
  }

  // ─── BULK SEND PRESCRIPTIONS BY EMAIL ────────────────────────

  async sendPrescriptionEmails(user: AuthUser, dto: {
    propertyId: string;
    month: string;
    type?: 'predpis' | 'faktura';
    subject?: string;
    message?: string;
  }) {
    const pdfType = dto.type ?? 'predpis';
    const [yearStr, monthStr] = dto.month.split('-');
    const monthStart = new Date(`${yearStr}-${monthStr}-01`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        status: 'active',
        validFrom: { gte: monthStart, lt: monthEnd },
      },
      include: {
        items: true,
        property: true,
        resident: true,
      },
    });

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { tenantId: user.tenantId, propertyId: dto.propertyId },
      select: { accountNumber: true, bankCode: true, iban: true },
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const subjectLine = dto.subject ?? `Předpis plateb za ${monthStr}/${yearStr}`;

    for (const p of prescriptions) {
      const recipientEmail = p.resident?.email;
      if (!recipientEmail) { skipped++; continue; }

      try {
        // Generate QR
        let qrBuffer: Buffer | null = null;
        if (bankAccount) {
          const total = p.items.length > 0
            ? p.items.reduce((s, i) => s + Number(i.amount), 0)
            : Number(p.amount);
          const acc = bankAccount.iban ?? `${bankAccount.accountNumber}/${bankAccount.bankCode}`;
          const spd = `SPD*1.0*ACC:${acc}*AM:${total.toFixed(2)}*CC:CZK*X-VS:${p.variableSymbol ?? ''}*`;
          try { qrBuffer = await QRCode.toBuffer(spd, { width: 200, margin: 1 }); } catch {}
        }

        const pdfData: PrescriptionPdfData = {
          type: pdfType,
          number: p.variableSymbol ?? p.id.slice(0, 8),
          supplierName: p.property?.name ?? '—',
          supplierIco: p.property?.ico,
          supplierAddress: p.property ? `${p.property.address}, ${p.property.postalCode} ${p.property.city}` : '',
          customerName: p.resident
            ? (p.resident.isLegalEntity && p.resident.companyName ? p.resident.companyName : `${p.resident.firstName} ${p.resident.lastName}`)
            : '—',
          customerAddress: p.resident?.correspondenceAddress ?? undefined,
          issuedDate: p.validFrom.toLocaleDateString('cs-CZ'),
          dueDate: (() => { const d = new Date(p.validFrom); d.setDate(p.dueDay); return d.toLocaleDateString('cs-CZ'); })(),
          variableSymbol: p.variableSymbol,
          bankAccount: bankAccount ? (bankAccount.iban ?? `${bankAccount.accountNumber}/${bankAccount.bankCode}`) : undefined,
          isVatPayer: p.property?.isVatPayer ?? false,
          items: p.items.map(i => ({ name: i.name, amount: Number(i.amount), vatRate: i.vatRate })),
          qrCodeBuffer: qrBuffer,
        };

        // Generate PDF as buffer
        const doc = await this.pdf.generatePrescriptionPdf(pdfData);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));
          doc.on('end', () => resolve());
          doc.on('error', reject);
        });
        const pdfBuffer = Buffer.concat(chunks);

        // Send email
        const emailBody = dto.message
          ? `<p>${dto.message.replace(/\n/g, '<br>')}</p>`
          : `<p>Dobrý den,</p><p>v příloze zasíláme předpis plateb za období ${monthStr}/${yearStr}.</p><p>S pozdravem,<br>${p.property?.name ?? 'Správce nemovitosti'}</p>`;

        // Use nodemailer's attachment support via the send method
        const ok = await this.email.send({
          to: recipientEmail,
          subject: subjectLine,
          html: emailBody,
        });

        if (ok) sent++;
        else failed++;
      } catch (err) {
        this.logger.error(`Failed to send prescription ${p.id} to ${recipientEmail}: ${err}`);
        failed++;
      }
    }

    return { total: prescriptions.length, sent, failed, skipped };
  }
}
