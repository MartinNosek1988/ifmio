import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class KontoService {
  private readonly logger = new Logger(KontoService.name)

  constructor(private prisma: PrismaService) {}

  async getOrCreateAccount(tenantId: string, propertyId: string, unitId: string, residentId: string) {
    return this.prisma.ownerAccount.upsert({
      where: { tenantId_unitId_residentId: { tenantId, unitId, residentId } },
      create: { tenantId, propertyId, unitId, residentId },
      update: {},
    })
  }

  async postDebit(
    accountId: string, amount: Decimal | number,
    sourceType: 'PRESCRIPTION' | 'BANK_TRANSACTION' | 'CREDIT_APPLICATION' | 'LATE_FEE' | 'MANUAL_ADJUSTMENT',
    sourceId: string, description: string, date?: Date,
  ) {
    return this.appendEntry(accountId, 'DEBIT', new Decimal(amount), sourceType, sourceId, description, date ?? new Date())
  }

  async postCredit(
    accountId: string, amount: Decimal | number,
    sourceType: 'PRESCRIPTION' | 'BANK_TRANSACTION' | 'CREDIT_APPLICATION' | 'LATE_FEE' | 'MANUAL_ADJUSTMENT',
    sourceId: string, description: string, date?: Date,
  ) {
    return this.appendEntry(accountId, 'CREDIT', new Decimal(amount), sourceType, sourceId, description, date ?? new Date())
  }

  private async appendEntry(
    accountId: string,
    type: 'DEBIT' | 'CREDIT' | 'ADJUSTMENT',
    amount: Decimal,
    sourceType: 'PRESCRIPTION' | 'BANK_TRANSACTION' | 'CREDIT_APPLICATION' | 'LATE_FEE' | 'MANUAL_ADJUSTMENT',
    sourceId: string,
    description: string,
    date: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.ownerAccount.findUniqueOrThrow({ where: { id: accountId } })
      const current = new Decimal(account.currentBalance)

      let newBalance: Decimal
      if (type === 'DEBIT') {
        newBalance = current.add(amount) // owed increases
      } else {
        newBalance = current.sub(amount) // owed decreases
      }

      const entry = await tx.ledgerEntry.create({
        data: {
          accountId,
          type: type as any,
          amount,
          balance: newBalance,
          sourceType: sourceType as any,
          sourceId,
          description,
          postingDate: date,
        },
      })

      await tx.ownerAccount.update({
        where: { id: accountId },
        data: { currentBalance: newBalance, lastPostingAt: date },
      })

      return entry
    })
  }

  async getAccountLedger(accountId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [entries, total, account] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { accountId },
        orderBy: { postingDate: 'desc' },
        take: pageSize,
        skip,
      }),
      this.prisma.ledgerEntry.count({ where: { accountId } }),
      this.prisma.ownerAccount.findUnique({
        where: { id: accountId },
        select: { currentBalance: true },
      }),
    ])

    return {
      entries,
      total,
      currentBalance: account?.currentBalance ?? new Decimal(0),
    }
  }

  async getAccountByResident(tenantId: string, unitId: string, residentId: string) {
    return this.prisma.ownerAccount.findUnique({
      where: { tenantId_unitId_residentId: { tenantId, unitId, residentId } },
      include: { resident: true, unit: true },
    })
  }

  async getPropertyAccounts(tenantId: string, propertyId: string) {
    return this.prisma.ownerAccount.findMany({
      where: { tenantId, propertyId },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true, knDesignation: true } },
      },
      orderBy: [{ unit: { name: 'asc' } }, { resident: { lastName: 'asc' } }],
    })
  }

  async getAccountDetail(accountId: string) {
    return this.prisma.ownerAccount.findUnique({
      where: { id: accountId },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true, knDesignation: true } },
        property: { select: { id: true, name: true } },
      },
    })
  }

  async recalculateBalance(accountId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntry.findMany({
        where: { accountId },
        orderBy: { postingDate: 'asc' },
      })

      let balance = new Decimal(0)
      for (const entry of entries) {
        if (entry.type === 'DEBIT') balance = balance.add(entry.amount)
        else balance = balance.sub(entry.amount)

        await tx.ledgerEntry.update({
          where: { id: entry.id },
          data: { balance },
        })
      }

      await tx.ownerAccount.update({
        where: { id: accountId },
        data: { currentBalance: balance, lastPostingAt: entries.length > 0 ? entries[entries.length - 1].postingDate : null },
      })

      return balance
    })
  }
}
