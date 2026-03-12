import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async getOverview(user: AuthUser) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount')
    const reminderScopeWhere = await this.scope.scopeByRelation(user, 'resident')
    const ids = await this.scope.getAccessiblePropertyIds(user)
    const propertyFilter = ids !== null ? { id: { in: ids } } : {}

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
      prescriptionVolumeAgg,
      recentTransactions,
      recentTickets,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { tenantId, status: 'active', ...propertyFilter } as any,
      }),

      this.prisma.unit.count({
        where: { property: { tenantId, ...propertyFilter } } as any,
      }),

      this.prisma.unit.count({
        where: { property: { tenantId, ...propertyFilter }, isOccupied: true } as any,
      }),

      this.prisma.resident.count({
        where: { tenantId, isActive: true, ...scopeWhere } as any,
      }),

      this.prisma.resident.count({
        where: { tenantId, hasDebt: true, isActive: true, ...scopeWhere } as any,
      }),

      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, ...scopeWhere } as any,
      }),

      this.prisma.helpdeskTicket.count({
        where: { tenantId, priority: 'urgent', status: { in: ['open', 'in_progress'] }, ...scopeWhere } as any,
      }),

      this.prisma.reminder.count({
        where: { tenantId, status: { in: ['draft', 'sent'] }, ...reminderScopeWhere } as any,
      }),

      this.prisma.bankTransaction.count({
        where: { tenantId, status: 'unmatched', ...txScopeWhere } as any,
      }),

      this.prisma.prescription.count({
        where: { tenantId, status: 'active', ...scopeWhere } as any,
      }),

      this.prisma.prescription.aggregate({
        where: { tenantId, status: 'active', ...scopeWhere } as any,
        _sum: { amount: true },
      }),

      this.prisma.bankTransaction.findMany({
        where:   { tenantId, ...txScopeWhere } as any,
        orderBy: { date: 'desc' },
        take:    5,
        include: {
          bankAccount: { select: { name: true } },
        },
      }),

      this.prisma.helpdeskTicket.findMany({
        where:   { tenantId, status: { in: ['open', 'in_progress'] }, ...scopeWhere } as any,
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
        monthlyPrescriptionVolume: Number(prescriptionVolumeAgg._sum.amount ?? 0),
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
