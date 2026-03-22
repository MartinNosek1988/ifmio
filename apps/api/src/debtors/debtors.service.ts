import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

export interface DebtorSummary {
  accountId: string
  residentId: string
  residentName: string
  isLegalEntity: boolean
  unitId: string
  unitName: string
  totalDebt: number
  oldestDebtDate: string
  daysOverdue: number
  agingBucket: string
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
  nextPrescriptionDue: string | null
  reminderCount: number
  lastReminderDate: string | null
}

export interface DebtorStats {
  totalDebtors: number
  totalDebtAmount: number
  totalOverpayments: number
  netPosition: number
  agingBreakdown: Record<string, number>
  averageDebtAge: number
}

export interface AgingDetail {
  openDebits: Array<{
    entryId: string
    sourceId: string
    originalAmount: number
    remainingAmount: number
    postingDate: string
    daysOverdue: number
  }>
  buckets: Record<string, number>
  oldestDebtDate: string | null
  totalOverdue: number
}

@Injectable()
export class DebtorsService {
  constructor(private prisma: PrismaService) {}

  async getPropertyDebtors(
    tenantId: string,
    propertyId: string,
    options?: { minAmount?: number; sortBy?: 'amount' | 'age' | 'name' }
  ): Promise<DebtorSummary[]> {
    // Get all accounts with positive balance (= debt)
    const accounts = await this.prisma.ownerAccount.findMany({
      where: {
        tenantId,
        propertyId,
        currentBalance: { gt: 0 },
        ...(options?.minAmount ? { currentBalance: { gte: options.minAmount } } : {}),
      },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
        _count: { select: { reminders: true } },
      },
    })

    const results: DebtorSummary[] = []
    const now = Date.now()

    for (const acc of accounts) {
      // Calculate aging via FIFO
      const aging = await this.calculateAccountAging(acc.id)

      // Get last payment (most recent CREDIT)
      const lastCredit = await this.prisma.ledgerEntry.findFirst({
        where: { accountId: acc.id, type: 'CREDIT' },
        orderBy: { postingDate: 'desc' },
        select: { postingDate: true, amount: true },
      })

      // Get next unpaid prescription due date
      const nextUnpaid = await this.prisma.prescription.findFirst({
        where: {
          tenantId,
          unitId: acc.unitId,
          residentId: acc.residentId,
          status: 'active',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        orderBy: { validFrom: 'asc' },
        select: { validFrom: true },
      })

      // Get last reminder
      const lastReminder = await this.prisma.kontoReminder.findFirst({
        where: { accountId: acc.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      const residentName = acc.resident.isLegalEntity && acc.resident.companyName
        ? acc.resident.companyName
        : `${acc.resident.lastName} ${acc.resident.firstName}`

      results.push({
        accountId: acc.id,
        residentId: acc.resident.id,
        residentName,
        isLegalEntity: acc.resident.isLegalEntity,
        unitId: acc.unit.id,
        unitName: acc.unit.name,
        totalDebt: Number(acc.currentBalance),
        oldestDebtDate: aging.oldestDebtDate ?? new Date().toISOString(),
        daysOverdue: aging.oldestDebtDate
          ? Math.floor((now - new Date(aging.oldestDebtDate).getTime()) / 86_400_000)
          : 0,
        agingBucket: this.getAgingBucket(
          aging.oldestDebtDate
            ? Math.floor((now - new Date(aging.oldestDebtDate).getTime()) / 86_400_000)
            : 0
        ),
        lastPaymentDate: lastCredit?.postingDate?.toISOString() ?? null,
        lastPaymentAmount: lastCredit ? Number(lastCredit.amount) : null,
        nextPrescriptionDue: nextUnpaid?.validFrom?.toISOString() ?? null,
        reminderCount: acc._count.reminders,
        lastReminderDate: lastReminder?.createdAt?.toISOString() ?? null,
      })
    }

    // Sort
    const sortBy = options?.sortBy ?? 'amount'
    if (sortBy === 'amount') results.sort((a, b) => b.totalDebt - a.totalDebt)
    else if (sortBy === 'age') results.sort((a, b) => b.daysOverdue - a.daysOverdue)
    else if (sortBy === 'name') results.sort((a, b) => a.residentName.localeCompare(b.residentName, 'cs'))

    return results
  }

  async getDebtorStats(tenantId: string, propertyId: string): Promise<DebtorStats> {
    const accounts = await this.prisma.ownerAccount.findMany({
      where: { tenantId, propertyId },
      select: { id: true, currentBalance: true },
    })

    let totalDebtors = 0
    let totalDebtAmount = new Decimal(0)
    let totalOverpayments = new Decimal(0)
    const agingBreakdown: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 }
    let totalDaysSum = 0
    const now = Date.now()

    for (const acc of accounts) {
      const bal = new Decimal(acc.currentBalance)
      if (bal.gt(0)) {
        totalDebtors++
        totalDebtAmount = totalDebtAmount.add(bal)

        const aging = await this.calculateAccountAging(acc.id)
        const days = aging.oldestDebtDate
          ? Math.floor((now - new Date(aging.oldestDebtDate).getTime()) / 86_400_000)
          : 0
        totalDaysSum += days

        // Add to bucket
        const bucket = this.getAgingBucket(days)
        agingBreakdown[bucket] = (agingBreakdown[bucket] ?? 0) + Number(bal)
      } else if (bal.lt(0)) {
        totalOverpayments = totalOverpayments.add(bal.abs())
      }
    }

    return {
      totalDebtors,
      totalDebtAmount: Number(totalDebtAmount),
      totalOverpayments: Number(totalOverpayments),
      netPosition: Number(totalDebtAmount.sub(totalOverpayments)),
      agingBreakdown,
      averageDebtAge: totalDebtors > 0 ? Math.round(totalDaysSum / totalDebtors) : 0,
    }
  }

  async calculateAccountAging(accountId: string): Promise<AgingDetail> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: { postingDate: 'asc' },
    })

    // FIFO: track open debits
    const openDebits: Array<{
      entryId: string
      sourceId: string
      originalAmount: Decimal
      remaining: Decimal
      postingDate: Date
    }> = []

    for (const entry of entries) {
      if (entry.type === 'DEBIT') {
        openDebits.push({
          entryId: entry.id,
          sourceId: entry.sourceId,
          originalAmount: new Decimal(entry.amount),
          remaining: new Decimal(entry.amount),
          postingDate: entry.postingDate,
        })
      } else {
        // CREDIT or ADJUSTMENT — apply to oldest open debit first (FIFO)
        let creditLeft = new Decimal(entry.amount)
        for (const debit of openDebits) {
          if (creditLeft.lte(0)) break
          if (debit.remaining.lte(0)) continue
          const apply = Decimal.min(creditLeft, debit.remaining)
          debit.remaining = debit.remaining.sub(apply)
          creditLeft = creditLeft.sub(apply)
        }
      }
    }

    // Filter to those with remaining > 0
    const now = Date.now()
    const remaining = openDebits.filter(d => d.remaining.gt(0))
    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 }
    let totalOverdue = new Decimal(0)

    for (const d of remaining) {
      const days = Math.floor((now - d.postingDate.getTime()) / 86_400_000)
      const bucket = this.getAgingBucket(days)
      buckets[bucket] = (buckets[bucket] ?? 0) + Number(d.remaining)
      totalOverdue = totalOverdue.add(d.remaining)
    }

    return {
      openDebits: remaining.map(d => ({
        entryId: d.entryId,
        sourceId: d.sourceId,
        originalAmount: Number(d.originalAmount),
        remainingAmount: Number(d.remaining),
        postingDate: d.postingDate.toISOString(),
        daysOverdue: Math.floor((now - d.postingDate.getTime()) / 86_400_000),
      })),
      buckets,
      oldestDebtDate: remaining.length > 0 ? remaining[0].postingDate.toISOString() : null,
      totalOverdue: Number(totalOverdue),
    }
  }

  private getAgingBucket(days: number): string {
    if (days <= 30) return '0-30'
    if (days <= 60) return '31-60'
    if (days <= 90) return '61-90'
    if (days <= 180) return '91-180'
    return '180+'
  }
}
