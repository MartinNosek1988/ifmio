import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FioProvider } from './fio.provider'
import { CryptoService } from '../common/crypto.service'

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name)

  constructor(
    private prisma: PrismaService,
    private fio: FioProvider,
    private crypto: CryptoService,
  ) {}

  async syncAccount(bankAccountId: string): Promise<{ imported: number; skipped: number; error?: string }> {
    const account = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } })
    if (!account || !account.syncEnabled || !account.apiToken) {
      return { imported: 0, skipped: 0, error: 'Sync not configured' }
    }

    if (account.bankProvider !== 'fio') {
      return { imported: 0, skipped: 0, error: `Unsupported provider: ${account.bankProvider}` }
    }

    try {
      // SECURITY: decrypt token before use (Wave 3)
      const decryptedToken = this.crypto.decrypt(account.apiToken)
      const transactions = await this.fio.fetchNewTransactions(decryptedToken)
      let imported = 0
      let skipped = 0

      for (const tx of transactions) {
        if (!tx.externalId) { skipped++; continue }

        const exists = await this.prisma.bankTransaction.findFirst({
          where: { bankAccountId, externalId: tx.externalId },
        })
        if (exists) { skipped++; continue }

        await this.prisma.bankTransaction.create({
          data: {
            tenantId: account.tenantId,
            bankAccountId,
            externalId: tx.externalId,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            counterparty: tx.counterAccountName,
            counterpartyAccount: tx.counterAccount,
            counterpartyBankCode: tx.counterBankCode,
            variableSymbol: tx.variableSymbol || null,
            specificSymbol: tx.specificSymbol || null,
            constantSymbol: tx.constantSymbol || null,
            description: tx.description,
            importSource: 'fio_api',
            status: 'unmatched',
            financialContextId: account.financialContextId,
          },
        })
        imported++
      }

      // Update sync status
      const lastTx = transactions[transactions.length - 1]
      await this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'active',
          syncStatusMessage: null,
          ...(lastTx?.externalId ? { lastSyncCursor: lastTx.externalId } : {}),
        },
      })

      this.logger.log(`Synced ${bankAccountId}: imported=${imported}, skipped=${skipped}`)
      return { imported, skipped }
    } catch (err: any) {
      this.logger.error(`Sync failed for ${bankAccountId}: ${err.message}`)
      await this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { syncStatus: 'error', syncStatusMessage: err.message?.slice(0, 255) },
      })
      return { imported: 0, skipped: 0, error: err.message }
    }
  }

  async configureApiSync(tenantId: string, bankAccountId: string, dto: {
    provider: string; apiToken: string; syncIntervalMin?: number
  }) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id: bankAccountId, tenantId } })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')

    if (dto.provider !== 'fio') {
      throw new BadRequestException('Podporovaný poskytovatel: fio')
    }

    // Verify token
    const verification = await this.fio.verifyToken(dto.apiToken)
    if (!verification.valid) {
      throw new BadRequestException(`Token nelze ověřit: ${verification.error}`)
    }

    const lastFour = dto.apiToken.slice(-4)
    // SECURITY: encrypt token before storing (Wave 3)
    const encryptedToken = this.crypto.encrypt(dto.apiToken)

    const updated = await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        bankProvider: dto.provider,
        apiToken: encryptedToken,
        apiTokenLastFour: lastFour,
        syncEnabled: true,
        syncIntervalMin: dto.syncIntervalMin ?? 60,
        syncStatus: 'active',
        syncStatusMessage: null,
      },
    })

    // Initial sync: last 90 days
    try {
      const from = new Date()
      from.setDate(from.getDate() - 90)
      const transactions = await this.fio.fetchByDateRange(dto.apiToken, from, new Date())
      let imported = 0

      for (const tx of transactions) {
        if (!tx.externalId) continue
        const exists = await this.prisma.bankTransaction.findFirst({
          where: { bankAccountId, externalId: tx.externalId },
        })
        if (exists) continue

        await this.prisma.bankTransaction.create({
          data: {
            tenantId,
            bankAccountId,
            externalId: tx.externalId,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            counterparty: tx.counterAccountName,
            counterpartyAccount: tx.counterAccount,
            counterpartyBankCode: tx.counterBankCode,
            variableSymbol: tx.variableSymbol || null,
            specificSymbol: tx.specificSymbol || null,
            constantSymbol: tx.constantSymbol || null,
            description: tx.description,
            importSource: 'fio_api',
            status: 'unmatched',
            financialContextId: account.financialContextId,
          },
        })
        imported++
      }

      await this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { lastSyncAt: new Date() },
      })

      this.logger.log(`Initial sync for ${bankAccountId}: ${imported} transactions`)
    } catch (err: any) {
      this.logger.warn(`Initial sync failed for ${bankAccountId}: ${err.message}`)
    }

    // SECURITY: strip apiToken from response (Wave 3)
    const { apiToken: _t, ...safeResponse } = updated
    return safeResponse
  }

  async disableSync(tenantId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id: bankAccountId, tenantId } })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')

    const result = await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { syncEnabled: false, syncStatus: 'disabled' },
    })
    // SECURITY: strip apiToken from response (Wave 3)
    const { apiToken: _t, ...safe } = result
    return safe
  }

  async triggerSync(tenantId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id: bankAccountId, tenantId } })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')
    if (!account.apiToken) throw new BadRequestException('API sync není nakonfigurován')

    return this.syncAccount(bankAccountId)
  }

  async getSyncStatus(tenantId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
      select: {
        id: true, name: true, bankProvider: true, apiTokenLastFour: true,
        syncEnabled: true, syncIntervalMin: true, lastSyncAt: true,
        syncStatus: true, syncStatusMessage: true,
        _count: { select: { transactions: true } },
      },
    })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')
    return account
  }

  // Called by cron — find all accounts due for sync
  async getAccountsDueForSync(): Promise<string[]> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { syncEnabled: true, syncStatus: { not: 'disabled' }, apiToken: { not: null } },
      select: { id: true, lastSyncAt: true, syncIntervalMin: true },
    })

    const now = Date.now()
    return accounts
      .filter(a => {
        if (!a.lastSyncAt) return true
        return now - a.lastSyncAt.getTime() >= (a.syncIntervalMin ?? 60) * 60_000
      })
      .map(a => a.id)
  }
}
