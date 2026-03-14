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

  async getOperationalDashboard(user: AuthUser) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const isTech = user.role === 'operations'
    const myFilter = isTech ? { assigneeId: user.id } : {}
    const myWoFilter = isTech ? { assigneeUserId: user.id } : {}

    const [
      openTickets, overdueTickets, highPrioTickets,
      openWo, overdueWo, todayWoDeadlines,
      resolvedLast30, completedWoLast30,
      overdueRevisions, incompleteProtocols,
      recentTicketList, recentWoList,
    ] = await Promise.all([
      // Helpdesk
      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, ...scopeWhere, ...myFilter } as any,
      }),
      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, resolutionDueAt: { lt: now }, ...scopeWhere, ...myFilter } as any,
      }),
      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, priority: { in: ['high', 'urgent'] }, ...scopeWhere, ...myFilter } as any,
      }),
      // Work Orders
      this.prisma.workOrder.count({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, ...scopeWhere, ...myWoFilter } as any,
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, deadline: { lt: now }, ...scopeWhere, ...myWoFilter } as any,
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, deadline: { gte: todayStart, lt: todayEnd }, ...scopeWhere, ...myWoFilter } as any,
      }),
      // Period metrics
      this.prisma.helpdeskTicket.count({
        where: { tenantId, resolvedAt: { gte: thirtyDaysAgo }, ...scopeWhere } as any,
      }),
      this.prisma.workOrder.count({
        where: { tenantId, completedAt: { gte: thirtyDaysAgo }, ...scopeWhere } as any,
      }),
      // Compliance
      isTech ? Promise.resolve(0) : this.prisma.revisionPlan.count({
        where: { tenantId, status: 'active', nextDueAt: { lt: now }, ...scopeWhere } as any,
      }),
      isTech ? Promise.resolve(0) : this.prisma.protocol.count({
        where: { tenantId, status: 'draft', ...scopeWhere } as any,
      }),
      // Recent lists (last 5)
      this.prisma.helpdeskTicket.findMany({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, ...scopeWhere, ...myFilter } as any,
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, number: true, title: true, priority: true, status: true, createdAt: true,
          property: { select: { name: true } }, assignee: { select: { name: true } } },
      }),
      this.prisma.workOrder.findMany({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, ...scopeWhere, ...myWoFilter } as any,
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, priority: true, status: true, deadline: true, createdAt: true,
          property: { select: { name: true } }, assigneeUser: { select: { name: true } }, asset: { select: { name: true } } },
      }),
    ])

    return {
      role: user.role,
      attention: {
        overdueTickets,
        overdueWo,
        highPrioTickets,
        todayWoDeadlines,
        overdueRevisions,
        incompleteProtocols,
      },
      workload: {
        openTickets,
        openWo,
      },
      period: {
        resolvedTicketsLast30: resolvedLast30,
        completedWoLast30: completedWoLast30,
      },
      recentTickets: recentTicketList.map(t => ({
        ...t, createdAt: t.createdAt.toISOString(),
        propertyName: (t as any).property?.name ?? null,
        assigneeName: (t as any).assignee?.name ?? null,
      })),
      recentWorkOrders: recentWoList.map(w => ({
        ...w, createdAt: w.createdAt.toISOString(),
        deadline: (w as any).deadline?.toISOString() ?? null,
        propertyName: (w as any).property?.name ?? null,
        assigneeName: (w as any).assigneeUser?.name ?? null,
        assetName: (w as any).asset?.name ?? null,
      })),
    }
  }
}
