import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class KontoService {
  private readonly logger = new Logger(KontoService.name)

  constructor(private prisma: PrismaService) {}

  async verifyAccountTenant(tenantId: string, accountId: string) {
    const account = await this.prisma.ownerAccount.findFirst({ where: { id: accountId, tenantId } })
    if (!account) throw new NotFoundException('Konto nenalezeno')
    return account
  }

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
    const decAmount = new Decimal(amount)
    if (decAmount.lte(0)) throw new BadRequestException('Částka musí být kladná')
    return this.appendEntry(accountId, 'DEBIT', decAmount, sourceType, sourceId, description, date ?? new Date())
  }

  async postCredit(
    accountId: string, amount: Decimal | number,
    sourceType: 'PRESCRIPTION' | 'BANK_TRANSACTION' | 'CREDIT_APPLICATION' | 'LATE_FEE' | 'MANUAL_ADJUSTMENT',
    sourceId: string, description: string, date?: Date,
  ) {
    const decAmount = new Decimal(amount)
    if (decAmount.lte(0)) throw new BadRequestException('Částka musí být kladná')
    return this.appendEntry(accountId, 'CREDIT', decAmount, sourceType, sourceId, description, date ?? new Date())
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
      // Row-level lock to prevent concurrent reads of stale balance
      const rows = await tx.$queryRaw<{ id: string; currentBalance: any }[]>`
        SELECT id, "currentBalance" FROM "owner_accounts" WHERE id = ${accountId} FOR UPDATE
      `
      if (!rows.length) throw new NotFoundException('Konto nenalezeno')
      const current = new Decimal(rows[0].currentBalance.toString())

      const newBalance = type === 'DEBIT'
        ? current.add(amount)
        : current.sub(amount)

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

  async getAccountLedger(tenantId: string, accountId: string, page = 1, pageSize = 20) {
    const account = await this.prisma.ownerAccount.findFirst({
      where: { id: accountId, tenantId },
      select: { currentBalance: true },
    })
    if (!account) throw new NotFoundException('Konto nenalezeno')

    const skip = (page - 1) * pageSize
    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { accountId },
        orderBy: { postingDate: 'desc' },
        take: pageSize,
        skip,
      }),
      this.prisma.ledgerEntry.count({ where: { accountId } }),
    ])

    return {
      entries,
      total,
      currentBalance: account.currentBalance,
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

  async getAccountDetail(tenantId: string, accountId: string) {
    const account = await this.prisma.ownerAccount.findFirst({
      where: { id: accountId, tenantId },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true, knDesignation: true } },
        property: { select: { id: true, name: true } },
      },
    })
    if (!account) throw new NotFoundException('Konto nenalezeno')
    return account
  }

  async recalculateBalance(tenantId: string, accountId: string) {
    const account = await this.prisma.ownerAccount.findFirst({ where: { id: accountId, tenantId } })
    if (!account) throw new NotFoundException('Konto nenalezeno')

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

  async applyOverpaymentOffset(
    tenantId: string,
    sourceAccountId: string,
    targetAccountId: string,
    amount: Decimal | number,
    description?: string,
  ) {
    const decAmount = new Decimal(amount)
    if (decAmount.lte(0)) throw new BadRequestException('Částka musí být kladná')

    // Pre-validate tenant ownership and balances
    const [source, target] = await Promise.all([
      this.verifyAccountTenant(tenantId, sourceAccountId),
      this.verifyAccountTenant(tenantId, targetAccountId),
    ])

    const sourceBalance = new Decimal(source.currentBalance)
    const targetBalance = new Decimal(target.currentBalance)

    if (sourceBalance.gte(0)) throw new BadRequestException('Zdrojové konto nemá přeplatek')
    if (targetBalance.lte(0)) throw new BadRequestException('Cílové konto nemá dluh')
    if (decAmount.gt(sourceBalance.abs())) throw new BadRequestException('Částka převyšuje přeplatek')
    if (decAmount.gt(targetBalance)) throw new BadRequestException('Částka převyšuje dluh')

    // Get unit names for descriptions
    const [sourceDetail, targetDetail] = await Promise.all([
      this.prisma.ownerAccount.findUnique({ where: { id: sourceAccountId }, include: { unit: { select: { name: true } } } }),
      this.prisma.ownerAccount.findUnique({ where: { id: targetAccountId }, include: { unit: { select: { name: true } } } }),
    ])

    const offsetId = `offset-${randomUUID()}`
    const srcDesc = description || `Zápočet přeplatku → ${targetDetail?.unit.name ?? targetAccountId}`
    const tgtDesc = description || `Zápočet přeplatku z ${sourceDetail?.unit.name ?? sourceAccountId}`
    const now = new Date()

    // Both postings in a SINGLE transaction with row-level locks
    return this.prisma.$transaction(async (tx) => {
      // --- Source: DEBIT (reduces overpayment toward 0) ---
      const [srcRow] = await tx.$queryRaw<{ id: string; currentBalance: any }[]>`
        SELECT id, "currentBalance" FROM "owner_accounts" WHERE id = ${sourceAccountId} FOR UPDATE
      `
      if (!srcRow) throw new NotFoundException('Zdrojové konto nenalezeno')
      const currentSrc = new Decimal(srcRow.currentBalance.toString())
      const newSrcBalance = currentSrc.add(decAmount)

      const sourceEntry = await tx.ledgerEntry.create({
        data: {
          accountId: sourceAccountId,
          type: 'DEBIT' as any,
          amount: decAmount,
          balance: newSrcBalance,
          sourceType: 'CREDIT_APPLICATION' as any,
          sourceId: offsetId,
          description: srcDesc,
          postingDate: now,
        },
      })
      await tx.ownerAccount.update({
        where: { id: sourceAccountId },
        data: { currentBalance: newSrcBalance, lastPostingAt: now },
      })

      // --- Target: CREDIT (reduces debt toward 0) ---
      const [tgtRow] = await tx.$queryRaw<{ id: string; currentBalance: any }[]>`
        SELECT id, "currentBalance" FROM "owner_accounts" WHERE id = ${targetAccountId} FOR UPDATE
      `
      if (!tgtRow) throw new NotFoundException('Cílové konto nenalezeno')
      const currentTgt = new Decimal(tgtRow.currentBalance.toString())
      const newTgtBalance = currentTgt.sub(decAmount)

      const targetEntry = await tx.ledgerEntry.create({
        data: {
          accountId: targetAccountId,
          type: 'CREDIT' as any,
          amount: decAmount,
          balance: newTgtBalance,
          sourceType: 'CREDIT_APPLICATION' as any,
          sourceId: offsetId,
          description: tgtDesc,
          postingDate: now,
        },
      })
      await tx.ownerAccount.update({
        where: { id: targetAccountId },
        data: { currentBalance: newTgtBalance, lastPostingAt: now },
      })

      return { sourceEntry, targetEntry }
    })
  }
}
