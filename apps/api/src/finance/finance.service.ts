import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { parseCsv } from './parsers/csv.parser';
import { parseAbo } from './parsers/abo.parser';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── BANK ACCOUNTS ────────────────────────────────────────────

  async listBankAccounts(user: AuthUser) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });
  }

  async createBankAccount(user: AuthUser, dto: {
    name: string;
    accountNumber: string;
    iban?: string;
    bankCode?: string;
    currency?: string;
    propertyId?: string;
  }) {
    return this.prisma.bankAccount.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        bankCode: dto.bankCode,
        currency: dto.currency ?? 'CZK',
        propertyId: dto.propertyId,
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
      page?: number;
      limit?: number;
    },
  ) {
    const { bankAccountId, status, type, dateFrom, dateTo } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.BankTransactionWhereInput = {
      tenantId: user.tenantId,
      ...(bankAccountId ? { bankAccountId } : {}),
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

  async listPrescriptions(user: AuthUser, query: {
    propertyId?: string;
    residentId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { propertyId, residentId, status = 'active', type } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {
      tenantId: user.tenantId,
      status: status as Prisma.EnumPrescriptionStatusFilter,
      ...(type ? { type: type as Prisma.EnumPrescriptionTypeFilter } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(residentId ? { residentId } : {}),
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
    validFrom: string;
    validTo?: string;
    items?: { name: string; amount: number; vatRate?: number; unit?: string; quantity?: number }[];
  }) {
    const { items, ...data } = dto;
    return this.prisma.prescription.create({
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
  }

  // ─── BILLING PERIODS ──────────────────────────────────────────

  async listBillingPeriods(user: AuthUser, propertyId?: string) {
    return this.prisma.billingPeriod.findMany({
      where: {
        tenantId: user.tenantId,
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
    const baseWhere = {
      tenantId: user.tenantId,
      ...(propertyId ? { propertyId } : {}),
    };

    const [
      totalTransactions,
      unmatchedCount,
      activePrescriptions,
      openBillingPeriods,
    ] = await Promise.all([
      this.prisma.bankTransaction.aggregate({
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.bankTransaction.count({
        where: { ...baseWhere, status: 'unmatched' },
      }),
      this.prisma.prescription.count({
        where: { ...baseWhere, status: 'active' },
      }),
      this.prisma.billingPeriod.count({
        where: { ...baseWhere, status: 'open' },
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

    const content  = file.buffer.toString('utf-8')
    const fileName = file.originalname.toLowerCase()

    const format = fileName.endsWith('.abo') || fileName.endsWith('.bbf')
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
            tenantId:       user.tenantId,
            bankAccountId,
            date:           new Date(tx.date),
            amount:         tx.amount,
            type:           tx.type,
            counterparty:   tx.counterparty || null,
            variableSymbol: tx.variableSymbol || null,
            description:    tx.description || null,
            status:         'unmatched',
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

  // ─── PÁROVÁNÍ TRANSAKCÍ ───────────────────────────────────────

  async matchTransactions(user: AuthUser, bankAccountId?: string) {
    const where: any = {
      tenantId: user.tenantId,
      status:   'unmatched',
      ...(bankAccountId ? { bankAccountId } : {}),
    }

    const [transactions, prescriptions] = await Promise.all([
      this.prisma.bankTransaction.findMany({ where }),
      this.prisma.prescription.findMany({
        where:   { tenantId: user.tenantId, status: 'active' },
        include: { items: true },
      }),
    ])

    let matched   = 0
    let unmatched = 0
    const results: any[] = []

    for (const tx of transactions) {
      let matchedPrescription: any = null
      let strategy = ''

      // Strategie 1: VS match
      if (tx.variableSymbol) {
        matchedPrescription = prescriptions.find(
          (p) => p.variableSymbol === tx.variableSymbol
        )
        if (matchedPrescription) strategy = 'vs_match'
      }

      // Strategie 2: Amount + date fallback
      if (!matchedPrescription) {
        const txAmount = Number(tx.amount)
        matchedPrescription = prescriptions.find((p) => {
          const totalAmount = Number(p.amount)
          return Math.abs(totalAmount - txAmount) < 0.01
        })
        if (matchedPrescription) strategy = 'amount_match'
      }

      if (matchedPrescription) {
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data:  {
            status:         'matched',
            prescriptionId: matchedPrescription.id,
          },
        })
        matched++
        results.push({
          transactionId:  tx.id,
          prescriptionId: matchedPrescription.id,
          strategy,
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
      }),
      this.prisma.prescription.findFirst({
        where: { id: prescriptionId, tenantId: user.tenantId },
      }),
    ])

    if (!tx)           throw new NotFoundException('Transakce nenalezena')
    if (!prescription) throw new NotFoundException('Předpis nenalezen')

    if (tx.status === 'matched') {
      throw new BadRequestException('Transakce je již spárována')
    }

    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        status:         'matched',
        prescriptionId: prescriptionId,
      },
    })
  }

  // ─── DELETE ──────────────────────────────────────────────────

  async deletePrescription(user: AuthUser, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!prescription) throw new NotFoundException('Předpis nenalezen')

    await this.prisma.prescriptionItem.deleteMany({ where: { prescriptionId: id } })
    await this.prisma.prescription.delete({ where: { id } })
  }

  async deleteTransaction(user: AuthUser, id: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!tx) throw new NotFoundException('Transakce nenalezena')

    await this.prisma.bankTransaction.delete({ where: { id } })
  }
}
