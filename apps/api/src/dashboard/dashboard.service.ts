import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(user: AuthUser) {
    const tenantId = user.tenantId

    const [
      propertiesCount,
      unitsCount,
      occupiedUnits,
      residentsCount,
      debtorsCount,
      openTickets,
      urgentTickets,
      activeReminders,
      unmatchedTransactions,
      activePrescriptions,
      recentTransactions,
      recentTickets,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { tenantId, status: 'active' },
      }),

      this.prisma.unit.count({
        where: { property: { tenantId } },
      }),

      this.prisma.unit.count({
        where: { property: { tenantId }, isOccupied: true },
      }),

      this.prisma.resident.count({
        where: { tenantId, isActive: true },
      }),

      this.prisma.resident.count({
        where: { tenantId, hasDebt: true, isActive: true },
      }),

      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] } },
      }),

      this.prisma.helpdeskTicket.count({
        where: { tenantId, priority: 'urgent', status: { in: ['open', 'in_progress'] } },
      }),

      this.prisma.reminder.count({
        where: { tenantId, status: { in: ['draft', 'sent'] } },
      }),

      this.prisma.bankTransaction.count({
        where: { tenantId, status: 'unmatched' },
      }),

      this.prisma.prescription.count({
        where: { tenantId, status: 'active' },
      }),

      this.prisma.bankTransaction.findMany({
        where:   { tenantId },
        orderBy: { date: 'desc' },
        take:    5,
        include: {
          bankAccount: { select: { name: true } },
        },
      }),

      this.prisma.helpdeskTicket.findMany({
        where:   { tenantId, status: { in: ['open', 'in_progress'] } },
        orderBy: { createdAt: 'desc' },
        take:    5,
        include: {
          property: { select: { name: true } },
        },
      }),
    ])

    const occupancyRate = unitsCount > 0
      ? Math.round((occupiedUnits / unitsCount) * 100)
      : 0

    const alerts: { type: string; message: string; link: string }[] = []
    if (debtorsCount > 0) alerts.push({
      type:    'warning',
      message: `${debtorsCount} dlužníků vyžaduje upomínku`,
      link:    '/reminders/debtors',
    })
    if (urgentTickets > 0) alerts.push({
      type:    'error',
      message: `${urgentTickets} urgentních ticketů`,
      link:    '/helpdesk?priority=urgent',
    })
    if (unmatchedTransactions > 0) alerts.push({
      type:    'info',
      message: `${unmatchedTransactions} nespárovaných transakcí`,
      link:    '/finance/transactions?status=unmatched',
    })

    return {
      kpi: {
        propertiesCount,
        unitsCount,
        occupiedUnits,
        occupancyRate,
        residentsCount,
        debtorsCount,
        openTickets,
        urgentTickets,
        activeReminders,
        unmatchedTransactions,
        activePrescriptions,
      },
      alerts,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        amount:    Number(t.amount),
        date:      t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      recentTickets: recentTickets.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    }
  }
}
