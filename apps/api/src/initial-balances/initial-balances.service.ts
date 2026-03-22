import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KontoService } from '../konto/konto.service'
import { Decimal } from '@prisma/client/runtime/library'
import type {
  SetOwnerBalanceDto,
  BulkSetOwnerBalancesDto,
  SetBankBalanceDto,
  SetFundBalanceDto,
  SetDepositDto,
  SetMeterReadingDto,
} from './dto/initial-balance.dto'

@Injectable()
export class InitialBalancesService {
  private readonly logger = new Logger(InitialBalancesService.name)

  constructor(
    private prisma: PrismaService,
    private konto: KontoService,
  ) {}

  // ─── GET ALL ─────────────────────────────────────────────────────

  async getPropertyInitialBalances(tenantId: string, propertyId: string) {
    const all = await this.prisma.initialBalance.findMany({
      where: { tenantId, propertyId },
      orderBy: { createdAt: 'asc' },
    })

    // Also get konto opening balance status for owner balances
    const kontoStatus = await this.konto.getOpeningBalanceStatus(tenantId, propertyId)

    return {
      ownerBalances: all.filter(b => b.type === 'OWNER_DEBT' || b.type === 'OWNER_OVERPAYMENT'),
      bankBalances: all.filter(b => b.type === 'BANK_ACCOUNT'),
      fundBalances: all.filter(b => b.type === 'FUND_BALANCE'),
      deposits: all.filter(b => b.type === 'DEPOSIT'),
      meterReadings: all.filter(b => b.type === 'METER_READING'),
      kontoStatus,
    }
  }

  // ─── OWNER BALANCE ───────────────────────────────────────────────

  async setOwnerBalance(tenantId: string, userId: string | undefined, dto: SetOwnerBalanceDto) {
    const cutoverDate = new Date(dto.cutoverDate)

    // Check if already set in konto
    const account = await this.konto.getOrCreateAccount(
      tenantId, dto.propertyId, dto.unitId, dto.residentId,
    )

    if (account.openingBalanceSet) {
      // Already set — update the InitialBalance record only (konto already posted)
      const type = dto.amount >= 0 ? 'OWNER_DEBT' : 'OWNER_OVERPAYMENT'
      const ib = await this.upsertInitialBalance(tenantId, dto.propertyId, type, dto.unitId, 'unit', dto.amount, cutoverDate, dto.note, userId)
      // Mark as posted (konto was already set in a previous call)
      await this.prisma.initialBalance.update({
        where: { id: ib.id },
        data: { postedToKonto: true },
      })
      return { account, initialBalance: ib }
    }

    // Delegate to konto service for first-time set
    const result = await this.konto.setOpeningBalance(
      tenantId, dto.propertyId, dto.unitId, dto.residentId,
      dto.amount, cutoverDate, dto.note,
    )

    // Track in InitialBalance with konto posting info
    const type = dto.amount >= 0 ? 'OWNER_DEBT' : 'OWNER_OVERPAYMENT'
    const ib = await this.upsertInitialBalance(
      tenantId, dto.propertyId, type as any, dto.unitId, 'unit',
      dto.amount, cutoverDate, dto.note, userId,
    )

    // Update with konto tracking
    await this.prisma.initialBalance.update({
      where: { id: ib.id },
      data: {
        postedToKonto: true,
        ledgerEntryId: result.entry?.id ?? null,
      },
    })

    return { account: result.account, entry: result.entry, initialBalance: ib }
  }

  async bulkSetOwnerBalances(tenantId: string, userId: string | undefined, dto: BulkSetOwnerBalancesDto) {
    const cutoverDate = new Date(dto.cutoverDate)
    let processed = 0, skipped = 0, errors = 0
    const details: Array<{ unitId: string; residentId: string; amount: number; status: string; error?: string }> = []

    for (const item of dto.items) {
      try {
        await this.setOwnerBalance(tenantId, userId, {
          propertyId: dto.propertyId,
          unitId: item.unitId,
          residentId: item.residentId,
          amount: item.amount,
          cutoverDate: dto.cutoverDate,
          note: item.note,
        })
        processed++
        details.push({ unitId: item.unitId, residentId: item.residentId, amount: item.amount, status: 'set' })
      } catch (err: any) {
        if (err.message?.includes('již byl nastaven')) {
          skipped++
          details.push({ unitId: item.unitId, residentId: item.residentId, amount: item.amount, status: 'skipped' })
        } else {
          errors++
          details.push({ unitId: item.unitId, residentId: item.residentId, amount: item.amount, status: 'error', error: err.message })
          this.logger.error(`Bulk owner balance error for unit ${item.unitId}: ${err.message}`)
        }
      }
    }

    return { processed, skipped, errors, details }
  }

  // ─── BANK ACCOUNT BALANCE ───────────────────────────────────────

  async setBankAccountBalance(tenantId: string, userId: string | undefined, dto: SetBankBalanceDto) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, tenantId },
    })
    if (!account) throw new NotFoundException('Bankovní účet nenalezen')

    const cutoverDate = new Date(dto.cutoverDate)

    return this.upsertInitialBalance(
      tenantId, dto.propertyId, 'BANK_ACCOUNT', dto.bankAccountId, 'bankAccount',
      dto.amount, cutoverDate, dto.note, userId,
    )
  }

  // ─── FUND BALANCE ───────────────────────────────────────────────

  async setFundBalance(tenantId: string, userId: string | undefined, dto: SetFundBalanceDto) {
    const component = await this.prisma.prescriptionComponent.findFirst({
      where: { id: dto.componentId, tenantId },
    })
    if (!component) throw new NotFoundException('Složka předpisu nenalezena')

    const cutoverDate = new Date(dto.cutoverDate)

    return this.upsertInitialBalance(
      tenantId, dto.propertyId, 'FUND_BALANCE', dto.componentId, 'fund',
      dto.amount, cutoverDate, dto.note, userId,
    )
  }

  // ─── DEPOSIT ────────────────────────────────────────────────────

  async setDeposit(tenantId: string, userId: string | undefined, dto: SetDepositDto) {
    const cutoverDate = new Date(dto.cutoverDate)

    // Kauce is money held — post as CREDIT (liability to return)
    const account = await this.konto.getOrCreateAccount(
      tenantId, dto.propertyId, dto.unitId, dto.residentId,
    )

    // Check for existing deposit entry to prevent duplicates
    const existing = await this.prisma.initialBalance.findFirst({
      where: { tenantId, propertyId: dto.propertyId, type: 'DEPOSIT', entityId: dto.unitId },
    })

    let ledgerEntryId: string | null = null

    if (!existing) {
      try {
        const entry = await this.konto.postCredit(
          account.id, dto.amount, 'OPENING_BALANCE',
          `deposit-${account.id}`,
          dto.note || 'Kauce — počáteční stav',
          cutoverDate,
        )
        ledgerEntryId = entry.id
      } catch (err) {
        this.logger.error(`Posting deposit to konto failed: ${err}`)
      }
    }

    const ib = await this.upsertInitialBalance(
      tenantId, dto.propertyId, 'DEPOSIT', dto.unitId, 'unit',
      dto.amount, cutoverDate, dto.note, userId,
    )

    // Track konto posting
    if (ledgerEntryId || existing) {
      await this.prisma.initialBalance.update({
        where: { id: ib.id },
        data: {
          postedToKonto: !!ledgerEntryId || !!existing,
          ...(ledgerEntryId ? { ledgerEntryId } : {}),
        },
      })
    }

    return ib
  }

  // ─── METER READING ──────────────────────────────────────────────

  async setMeterReading(tenantId: string, userId: string | undefined, dto: SetMeterReadingDto) {
    const meter = await this.prisma.meter.findFirst({
      where: { id: dto.meterId, tenantId },
    })
    if (!meter) throw new NotFoundException('Měřidlo nenalezeno')

    const cutoverDate = new Date(dto.cutoverDate)

    // Create initial meter reading
    const existing = await this.prisma.meterReading.findFirst({
      where: { meterId: dto.meterId, isInitial: true },
    })

    if (existing) {
      await this.prisma.meterReading.update({
        where: { id: existing.id },
        data: { value: dto.value, readingDate: cutoverDate },
      })
    } else {
      await this.prisma.meterReading.create({
        data: {
          meterId: dto.meterId,
          value: dto.value,
          readingDate: cutoverDate,
          source: 'initial',
          isInitial: true,
          note: dto.note || 'Počáteční stav měřidla',
        },
      })
    }

    // Update meter's lastReading
    await this.prisma.meter.update({
      where: { id: dto.meterId },
      data: { lastReading: dto.value, lastReadingDate: cutoverDate },
    })

    return this.upsertInitialBalance(
      tenantId, meter.propertyId ?? dto.propertyId, 'METER_READING', dto.meterId, 'meter',
      0, cutoverDate, dto.note, userId, new Decimal(dto.value),
    )
  }

  // ─── DELETE ─────────────────────────────────────────────────────

  async deleteInitialBalance(tenantId: string, id: string) {
    const ib = await this.prisma.initialBalance.findFirst({
      where: { id, tenantId },
    })
    if (!ib) throw new NotFoundException('Počáteční stav nenalezen')

    // Reverse konto effect for owner/deposit types
    if (ib.type === 'OWNER_DEBT' || ib.type === 'OWNER_OVERPAYMENT' || ib.type === 'DEPOSIT') {
      // Find the OPENING_BALANCE entry and post reversal
      if (ib.entityId) {
        try {
          const accounts = await this.prisma.ownerAccount.findMany({
            where: { tenantId, propertyId: ib.propertyId, unitId: ib.entityId },
            include: {
              entries: {
                where: { sourceType: 'OPENING_BALANCE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          })

          for (const acc of accounts) {
            const entry = acc.entries[0]
            if (entry) {
              // Post reversal: if original was DEBIT, post CREDIT and vice versa
              if (entry.type === 'DEBIT') {
                await this.konto.postCredit(
                  acc.id, Number(entry.amount), 'MANUAL_ADJUSTMENT',
                  `reversal-${ib.id}`, 'Storno počátečního stavu',
                )
              } else {
                await this.konto.postDebit(
                  acc.id, Number(entry.amount), 'MANUAL_ADJUSTMENT',
                  `reversal-${ib.id}`, 'Storno počátečního stavu',
                )
              }
            }

            // Reset opening balance flag
            await this.prisma.ownerAccount.update({
              where: { id: acc.id },
              data: { openingBalanceSet: false, openingBalanceDate: null },
            })
          }
        } catch (err) {
          this.logger.error(`Reversal for initial balance ${id} failed: ${err}`)
        }
      }
    }

    // Delete meter reading if applicable
    if (ib.type === 'METER_READING' && ib.entityId) {
      await this.prisma.meterReading.deleteMany({
        where: { meterId: ib.entityId, isInitial: true },
      }).catch(() => {})
    }

    await this.prisma.initialBalance.delete({ where: { id } })
    return { deleted: true }
  }

  // ─── HELPER ─────────────────────────────────────────────────────

  private async upsertInitialBalance(
    tenantId: string,
    propertyId: string,
    type: any,
    entityId: string,
    entityType: string,
    amount: number,
    cutoverDate: Date,
    note: string | undefined,
    createdBy: string | undefined,
    meterValue?: Decimal,
  ) {
    return this.prisma.initialBalance.upsert({
      where: {
        tenantId_propertyId_type_entityId: {
          tenantId, propertyId, type, entityId,
        },
      },
      create: {
        tenantId, propertyId, type, entityId, entityType,
        amount: new Decimal(amount.toFixed(2)),
        meterValue: meterValue ?? null,
        cutoverDate, note, createdBy,
      },
      update: {
        amount: new Decimal(amount.toFixed(2)),
        meterValue: meterValue ?? undefined,
        cutoverDate, note,
      },
    })
  }
}
