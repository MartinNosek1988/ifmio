import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import * as ExcelJS from 'exceljs';
import type { AuthUser } from '@ifmio/shared-types';

function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => v.includes(';') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  const lines = [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))]
  return '\ufeff' + lines.join('\r\n') // BOM for Excel UTF-8
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async getMonthlyReport(user: AuthUser, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount');

    const [transactions, prescriptions, residents] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: from, lte: to },
          ...txScopeWhere,
        } as any,
        orderBy: { date: 'asc' },
        include: {
          resident: { select: { id: true, firstName: true, lastName: true } },
          prescription: { select: { id: true, description: true } },
        },
      }),
      this.prisma.prescription.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'active',
          validFrom: { lte: to },
          OR: [{ validTo: null }, { validTo: { gte: from } }],
          ...scopeWhere,
        } as any,
        include: {
          property: { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.resident.count({
        where: { tenantId: user.tenantId, isActive: true, ...scopeWhere } as any,
      }),
    ]);

    const income = transactions
      .filter((t) => t.type === 'credit')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions
      .filter((t) => t.type === 'debit')
      .reduce((s, t) => s + Number(t.amount), 0);

    const expectedIncome = prescriptions.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    const collectionRate =
      expectedIncome > 0
        ? Math.round((income / expectedIncome) * 100)
        : 0;

    return {
      period: { year, month },
      summary: {
        income,
        expense,
        balance: income - expense,
        expectedIncome,
        collectionRate,
        activeResidents: residents,
        activePrescriptions: prescriptions.length,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        counterparty: t.counterparty,
        variableSymbol: t.variableSymbol,
        description: t.description,
        resident: t.resident
          ? `${t.resident.firstName} ${t.resident.lastName}`
          : null,
      })),
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        description: p.description,
        amount: Number(p.amount),
        dueDay: p.dueDay,
        property: p.property?.name,
        resident: p.resident
          ? `${p.resident.firstName} ${p.resident.lastName}`
          : null,
      })),
    };
  }

  async exportMonthlyXlsx(
    user: AuthUser,
    year: number,
    month: number,
  ): Promise<Buffer> {
    const report = await this.getMonthlyReport(user, year, month);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ifmio';
    wb.created = new Date();

    // --- Sheet 1: Souhrn ---
    const ws1 = wb.addWorksheet('Souhrn');
    ws1.columns = [
      { header: 'Ukazatel', key: 'label', width: 30 },
      { header: 'Hodnota', key: 'value', width: 20 },
    ];
    ws1.getRow(1).font = { bold: true };
    ws1.addRow({ label: 'Období', value: `${month}/${year}` });
    ws1.addRow({ label: 'Příjmy', value: report.summary.income });
    ws1.addRow({ label: 'Výdaje', value: report.summary.expense });
    ws1.addRow({ label: 'Bilance', value: report.summary.balance });
    ws1.addRow({
      label: 'Očekávané příjmy',
      value: report.summary.expectedIncome,
    });
    ws1.addRow({
      label: 'Míra inkasa (%)',
      value: report.summary.collectionRate,
    });
    ws1.addRow({
      label: 'Aktivní bydlící',
      value: report.summary.activeResidents,
    });
    ws1.addRow({
      label: 'Aktivní předpisy',
      value: report.summary.activePrescriptions,
    });

    // --- Sheet 2: Transakce ---
    const ws2 = wb.addWorksheet('Transakce');
    ws2.columns = [
      { header: 'Datum', key: 'date', width: 14 },
      { header: 'Částka', key: 'amount', width: 14 },
      { header: 'Typ', key: 'type', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Protistrana', key: 'counterparty', width: 25 },
      { header: 'VS', key: 'variableSymbol', width: 14 },
      { header: 'Popis', key: 'description', width: 30 },
      { header: 'Bydlící', key: 'resident', width: 20 },
    ];
    ws2.getRow(1).font = { bold: true };
    for (const t of report.transactions) {
      ws2.addRow(t);
    }

    // --- Sheet 3: Předpisy ---
    const ws3 = wb.addWorksheet('Předpisy');
    ws3.columns = [
      { header: 'Popis', key: 'description', width: 30 },
      { header: 'Částka', key: 'amount', width: 14 },
      { header: 'Den splatnosti', key: 'dueDay', width: 14 },
      { header: 'Nemovitost', key: 'property', width: 25 },
      { header: 'Bydlící', key: 'resident', width: 20 },
    ];
    ws3.getRow(1).font = { bold: true };
    for (const p of report.prescriptions) {
      ws3.addRow(p);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getYearlyOverview(user: AuthUser, year: number) {
    const months = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        this.getMonthlyReport(user, year, i + 1).then((r) => ({
          month: i + 1,
          income: r.summary.income,
          expense: r.summary.expense,
          balance: r.summary.balance,
          collectionRate: r.summary.collectionRate,
        })),
      ),
    );

    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expense: acc.expense + m.expense,
        balance: acc.balance + m.balance,
      }),
      { income: 0, expense: 0, balance: 0 },
    );

    return { year, months, totals };
  }

  async getDashboardKpi(user: AuthUser) {
    const tenantId = user.tenantId;
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const d90 = new Date();
    d90.setDate(d90.getDate() + 90);

    // For properties/units, use accessible property IDs
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const propertyFilter = ids !== null ? { id: { in: ids } } : {};
    const unitPropertyFilter = ids !== null ? { property: { id: { in: ids } } } : {};

    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      activeResidents,
      debtResidents,
      openTickets,
      openWorkOrders,
      expiringLeases,
      monthIncome,
      monthExpense,
      activePrescriptions,
      calibrationDue,
    ] = await Promise.all([
      this.prisma.property.count({ where: { tenantId, status: 'active', ...propertyFilter } as any }),
      this.prisma.unit.count({ where: { property: { tenantId, ...propertyFilter } } as any }),
      this.prisma.unit.count({ where: { property: { tenantId, ...propertyFilter }, isOccupied: true } as any }),
      this.prisma.resident.count({ where: { tenantId, isActive: true, ...scopeWhere } as any }),
      this.prisma.resident.count({ where: { tenantId, isActive: true, hasDebt: true, ...scopeWhere } as any }),
      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] }, ...scopeWhere } as any,
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: { in: ['nova', 'v_reseni'] }, ...scopeWhere } as any,
      }),
      this.prisma.leaseAgreement.count({
        where: {
          tenantId,
          status: 'aktivni',
          indefinite: false,
          endDate: { gte: now, lte: d90 },
          ...scopeWhere,
        } as any,
      }),
      this.prisma.bankTransaction
        .findMany({
          where: { tenantId, date: { gte: monthStart, lte: monthEnd }, type: 'credit', ...txScopeWhere } as any,
        })
        .then((txs) => txs.reduce((s, t) => s + Number(t.amount), 0)),
      this.prisma.bankTransaction
        .findMany({
          where: { tenantId, date: { gte: monthStart, lte: monthEnd }, type: 'debit', ...txScopeWhere } as any,
        })
        .then((txs) => txs.reduce((s, t) => s + Number(t.amount), 0)),
      this.prisma.prescription.count({
        where: { tenantId, status: 'active', ...scopeWhere } as any,
      }),
      this.prisma.meter.count({
        where: { tenantId, isActive: true, calibrationDue: { lt: now }, ...scopeWhere } as any,
      }),
    ]);

    const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const expectedMonthly = await this.prisma.prescription
      .findMany({ where: { tenantId, status: 'active', ...scopeWhere } as any })
      .then((ps) => ps.reduce((s, p) => s + Number(p.amount), 0));
    const collectionRate = expectedMonthly > 0 ? Math.round((monthIncome / expectedMonthly) * 100) : 0;

    return {
      properties: totalProperties,
      units: totalUnits,
      occupiedUnits,
      occupancyPct,
      activeResidents,
      debtResidents,
      openTickets,
      openWorkOrders,
      expiringLeases,
      calibrationDue,
      activePrescriptions,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      expectedMonthly,
      collectionRate,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // OPERATIONAL REPORT (Helpdesk + Work Orders)
  // ═══════════════════════════════════════════════════════════════

  async getOperationalReport(user: AuthUser, query: {
    propertyId?: string; dateFrom?: string; dateTo?: string;
    priority?: string; status?: string; assetId?: string; onlyOverdue?: string;
  }) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : now

    const ticketWhere: any = {
      tenantId, ...scopeWhere, createdAt: { gte: from, lte: to },
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.onlyOverdue === 'true' ? { resolutionDueAt: { lt: now }, status: { in: ['open', 'in_progress'] } } : {}),
    }
    const woWhere: any = {
      tenantId, ...scopeWhere, createdAt: { gte: from, lte: to },
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.onlyOverdue === 'true' ? { deadline: { lt: now }, status: { in: ['nova', 'v_reseni'] } } : {}),
    }

    const [
      tickets, woItems,
      ticketsByStatus, ticketsByPriority,
      woByStatus, woByPriority,
    ] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where: ticketWhere,
        include: {
          property: { select: { id: true, name: true } },
          asset: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          dispatcher: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.workOrder.findMany({
        where: woWhere,
        include: {
          property: { select: { id: true, name: true } },
          asset: { select: { id: true, name: true } },
          assigneeUser: { select: { id: true, name: true } },
          requesterUser: { select: { id: true, name: true } },
          dispatcherUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.helpdeskTicket.groupBy({ by: ['status'], where: ticketWhere, _count: true }),
      this.prisma.helpdeskTicket.groupBy({ by: ['priority'], where: ticketWhere, _count: true }),
      this.prisma.workOrder.groupBy({ by: ['status'], where: woWhere, _count: true }),
      this.prisma.workOrder.groupBy({ by: ['priority'], where: woWhere, _count: true }),
    ])

    const totalTickets = tickets.length
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
    const overdueTickets = tickets.filter(t =>
      (t.status === 'open' || t.status === 'in_progress') && t.resolutionDueAt && t.resolutionDueAt < now,
    ).length

    const totalWo = woItems.length
    const openWo = woItems.filter(w => w.status === 'nova' || w.status === 'v_reseni').length
    const completedWo = woItems.filter(w => w.status === 'vyresena' || w.status === 'uzavrena').length

    // Average resolution time (tickets with resolvedAt)
    const resolvedTickets = tickets.filter(t => t.resolvedAt)
    const avgResolveHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolvedTickets.length / 3_600_000)
      : null

    const completedWoItems = woItems.filter(w => w.completedAt)
    const avgCompleteHours = completedWoItems.length > 0
      ? Math.round(completedWoItems.reduce((s, w) => s + (w.completedAt!.getTime() - w.createdAt.getTime()), 0) / completedWoItems.length / 3_600_000)
      : null

    // Top assets by issue count
    const assetCounts = new Map<string, { id: string; name: string; count: number }>()
    for (const t of tickets) {
      if (t.asset) {
        const e = assetCounts.get(t.asset.id) ?? { id: t.asset.id, name: t.asset.name, count: 0 }
        e.count++
        assetCounts.set(t.asset.id, e)
      }
    }
    for (const w of woItems) {
      if (w.asset) {
        const e = assetCounts.get(w.asset.id) ?? { id: w.asset.id, name: w.asset.name, count: 0 }
        e.count++
        assetCounts.set(w.asset.id, e)
      }
    }
    const topAssets = Array.from(assetCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10)

    // Top resolvers
    const resolverCounts = new Map<string, { id: string; name: string; count: number }>()
    for (const t of tickets) {
      if (t.assignee) {
        const e = resolverCounts.get(t.assignee.id) ?? { id: t.assignee.id, name: t.assignee.name, count: 0 }
        e.count++
        resolverCounts.set(t.assignee.id, e)
      }
    }
    for (const w of woItems) {
      if (w.assigneeUser) {
        const e = resolverCounts.get(w.assigneeUser.id) ?? { id: w.assigneeUser.id, name: w.assigneeUser.name, count: 0 }
        e.count++
        resolverCounts.set(w.assigneeUser.id, e)
      }
    }
    const topResolvers = Array.from(resolverCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10)

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpi: {
        totalTickets, openTickets, overdueTickets,
        totalWo, openWo, completedWo,
        avgResolveHours, avgCompleteHours,
      },
      ticketsByStatus: ticketsByStatus.map(g => ({ status: g.status, count: g._count })),
      ticketsByPriority: ticketsByPriority.map(g => ({ priority: g.priority, count: g._count })),
      woByStatus: woByStatus.map(g => ({ status: g.status, count: g._count })),
      woByPriority: woByPriority.map(g => ({ priority: g.priority, count: g._count })),
      topAssets,
      topResolvers,
      tickets: tickets.map(t => ({
        type: 'request' as const,
        id: t.id,
        number: t.number,
        title: t.title,
        property: t.property?.name ?? null,
        asset: t.asset?.name ?? null,
        requester: t.requester?.name ?? null,
        dispatcher: t.dispatcher?.name ?? null,
        resolver: t.assignee?.name ?? null,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        dueAt: t.resolutionDueAt?.toISOString() ?? null,
        completedAt: t.resolvedAt?.toISOString() ?? null,
        requestOrigin: (t as any).requestOrigin ?? 'manual',
      })),
      workOrders: woItems.map(w => ({
        type: 'work_order' as const,
        id: w.id,
        title: w.title,
        property: w.property?.name ?? null,
        asset: w.asset?.name ?? null,
        requester: w.requesterUser?.name ?? w.requester ?? null,
        dispatcher: w.dispatcherUser?.name ?? null,
        resolver: w.assigneeUser?.name ?? w.assignee ?? null,
        priority: w.priority,
        status: w.status,
        createdAt: w.createdAt.toISOString(),
        dueAt: w.deadline?.toISOString() ?? null,
        completedAt: w.completedAt?.toISOString() ?? null,
      })),
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ASSET TECHNICAL REPORT
  // ═══════════════════════════════════════════════════════════════

  async getAssetReport(user: AuthUser, query: {
    propertyId?: string; assetId?: string; dateFrom?: string; dateTo?: string;
  }) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), 0, 1)
    const to = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : now

    const assetWhere: any = {
      tenantId, deletedAt: null, ...scopeWhere,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.assetId ? { id: query.assetId } : {}),
    }

    const assets = await this.prisma.asset.findMany({
      where: assetWhere,
      include: {
        property: { select: { id: true, name: true } },
        assetType: { select: { id: true, name: true } },
        helpdeskTickets: {
          where: { createdAt: { gte: from, lte: to } },
          select: { id: true, status: true, createdAt: true },
        },
        workOrders: {
          where: { createdAt: { gte: from, lte: to } },
          select: { id: true, status: true, createdAt: true, deadline: true, completedAt: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 200,
    })

    // Count protocols per asset via source relations
    const assetIds = assets.map(a => a.id)
    const woIds = assets.flatMap(a => a.workOrders.map(w => w.id))
    const ticketIds = assets.flatMap(a => a.helpdeskTickets.map(t => t.id))

    const protocols = woIds.length > 0 || ticketIds.length > 0
      ? await this.prisma.protocol.findMany({
          where: {
            tenantId,
            createdAt: { gte: from, lte: to },
            OR: [
              ...(woIds.length > 0 ? [{ sourceType: 'work_order' as const, sourceId: { in: woIds } }] : []),
              ...(ticketIds.length > 0 ? [{ sourceType: 'helpdesk' as const, sourceId: { in: ticketIds } }] : []),
            ],
          },
          select: { id: true, sourceType: true, sourceId: true, createdAt: true },
        })
      : []

    const rows = assets.map(a => {
      const requests = a.helpdeskTickets.length
      const wos = a.workOrders.length
      const openWo = a.workOrders.filter(w => w.status === 'nova' || w.status === 'v_reseni').length
      const overdueWo = a.workOrders.filter(w =>
        (w.status === 'nova' || w.status === 'v_reseni') && w.deadline && w.deadline < now,
      ).length
      const relatedProts = protocols.filter(p =>
        (p.sourceType === 'work_order' && a.workOrders.some(w => w.id === p.sourceId)) ||
        (p.sourceType === 'helpdesk' && a.helpdeskTickets.some(t => t.id === p.sourceId)),
      ).length
      const allDates = [
        ...a.helpdeskTickets.map(t => t.createdAt),
        ...a.workOrders.map(w => w.createdAt),
      ]
      const lastActivity = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))).toISOString() : null

      return {
        id: a.id,
        name: a.name,
        category: a.category,
        property: a.property?.name ?? null,
        assetType: a.assetType?.name ?? null,
        requestCount: requests,
        workOrderCount: wos,
        protocolCount: relatedProts,
        openWorkOrders: openWo,
        overdueWorkOrders: overdueWo,
        totalInterventions: requests + wos,
        lastActivity,
      }
    })

    // Sort by total interventions descending for "most problematic"
    rows.sort((a, b) => b.totalInterventions - a.totalInterventions)

    const kpi = {
      totalAssets: rows.length,
      assetsWithIssues: rows.filter(r => r.totalInterventions > 0).length,
      totalRequests: rows.reduce((s, r) => s + r.requestCount, 0),
      totalWorkOrders: rows.reduce((s, r) => s + r.workOrderCount, 0),
      totalOpenWo: rows.reduce((s, r) => s + r.openWorkOrders, 0),
      totalOverdueWo: rows.reduce((s, r) => s + r.overdueWorkOrders, 0),
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, kpi, rows }
  }

  // ═══════════════════════════════════════════════════════════════
  // PROTOCOL REGISTER REPORT
  // ═══════════════════════════════════════════════════════════════

  async getProtocolReport(user: AuthUser, query: {
    propertyId?: string; dateFrom?: string; dateTo?: string;
    protocolType?: string; status?: string;
  }) {
    const tenantId = user.tenantId
    const now = new Date()
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), 0, 1)
    const to = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : now

    const where: any = {
      tenantId,
      createdAt: { gte: from, lte: to },
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.protocolType ? { protocolType: query.protocolType } : {}),
      ...(query.status ? { status: query.status } : {}),
    }

    const [items, byType, byStatus] = await Promise.all([
      this.prisma.protocol.findMany({
        where,
        include: {
          property: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.protocol.groupBy({ by: ['protocolType'], where, _count: true }),
      this.prisma.protocol.groupBy({ by: ['status'], where, _count: true }),
    ])

    const total = items.length
    const completed = items.filter(p => p.status === 'completed' || p.status === 'confirmed').length
    const confirmed = items.filter(p => p.status === 'confirmed').length
    const withPdf = items.filter(p => p.generatedPdfDocumentId).length
    const withoutPdf = total - withPdf
    const withSigned = items.filter(p => p.signedDocumentId).length

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpi: { total, completed, confirmed, withPdf, withoutPdf, withSigned },
      byType: byType.map(g => ({ type: g.protocolType, count: g._count })),
      byStatus: byStatus.map(g => ({ status: g.status, count: g._count })),
      rows: items.map(p => ({
        id: p.id,
        number: p.number,
        title: p.title,
        protocolType: p.protocolType,
        status: p.status,
        sourceType: p.sourceType,
        sourceId: p.sourceId,
        property: p.property?.name ?? null,
        resolverName: p.resolverName,
        createdAt: p.createdAt.toISOString(),
        completedAt: p.completedAt?.toISOString() ?? null,
        handoverAt: p.handoverAt?.toISOString() ?? null,
        satisfaction: p.satisfaction,
        hasGeneratedPdf: !!p.generatedPdfDocumentId,
        hasSignedDocument: !!p.signedDocumentId,
        lineCount: p._count.lines,
      })),
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORTS (XLSX)
  // ═══════════════════════════════════════════════════════════════

  async exportOperationalXlsx(user: AuthUser, query: Parameters<ReportsService['getOperationalReport']>[1]): Promise<Buffer> {
    const report = await this.getOperationalReport(user, query)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'ifmio'

    const ws1 = wb.addWorksheet('Požadavky')
    ws1.columns = [
      { header: 'Číslo', key: 'number', width: 10 },
      { header: 'Název', key: 'title', width: 30 },
      { header: 'Nemovitost', key: 'property', width: 20 },
      { header: 'Zařízení', key: 'asset', width: 20 },
      { header: 'Zadavatel', key: 'requester', width: 18 },
      { header: 'Dispečer', key: 'dispatcher', width: 18 },
      { header: 'Řešitel', key: 'resolver', width: 18 },
      { header: 'Priorita', key: 'priority', width: 12 },
      { header: 'Stav', key: 'status', width: 12 },
      { header: 'Vytvořeno', key: 'createdAt', width: 18 },
      { header: 'Termín', key: 'dueAt', width: 18 },
      { header: 'Dokončeno', key: 'completedAt', width: 18 },
    ]
    ws1.getRow(1).font = { bold: true }
    for (const t of report.tickets) ws1.addRow(t)

    const ws2 = wb.addWorksheet('Pracovní úkoly')
    ws2.columns = ws1.columns.map(c => ({ ...c }))
    ws2.getRow(1).font = { bold: true }
    for (const w of report.workOrders) ws2.addRow(w)

    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  async exportAssetXlsx(user: AuthUser, query: Parameters<ReportsService['getAssetReport']>[1]): Promise<Buffer> {
    const report = await this.getAssetReport(user, query)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'ifmio'

    const ws = wb.addWorksheet('Zařízení')
    ws.columns = [
      { header: 'Zařízení', key: 'name', width: 25 },
      { header: 'Kategorie', key: 'category', width: 15 },
      { header: 'Nemovitost', key: 'property', width: 20 },
      { header: 'Typ', key: 'assetType', width: 20 },
      { header: 'Požadavky', key: 'requestCount', width: 12 },
      { header: 'Úkoly', key: 'workOrderCount', width: 12 },
      { header: 'Protokoly', key: 'protocolCount', width: 12 },
      { header: 'Otevřené úkoly', key: 'openWorkOrders', width: 14 },
      { header: 'Po termínu', key: 'overdueWorkOrders', width: 12 },
      { header: 'Celkem zásahů', key: 'totalInterventions', width: 14 },
      { header: 'Poslední aktivita', key: 'lastActivity', width: 18 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const r of report.rows) ws.addRow(r)

    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  async exportProtocolXlsx(user: AuthUser, query: Parameters<ReportsService['getProtocolReport']>[1]): Promise<Buffer> {
    const report = await this.getProtocolReport(user, query)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'ifmio'

    const ws = wb.addWorksheet('Protokoly')
    ws.columns = [
      { header: 'Číslo', key: 'number', width: 18 },
      { header: 'Název', key: 'title', width: 25 },
      { header: 'Typ', key: 'protocolType', width: 18 },
      { header: 'Stav', key: 'status', width: 12 },
      { header: 'Nemovitost', key: 'property', width: 20 },
      { header: 'Řešitel', key: 'resolverName', width: 18 },
      { header: 'Vytvořeno', key: 'createdAt', width: 18 },
      { header: 'Dokončeno', key: 'completedAt', width: 18 },
      { header: 'Předáno', key: 'handoverAt', width: 18 },
      { header: 'Spokojenost', key: 'satisfaction', width: 14 },
      { header: 'PDF', key: 'hasGeneratedPdf', width: 8 },
      { header: 'Podpis', key: 'hasSignedDocument', width: 8 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const r of report.rows) {
      ws.addRow({ ...r, hasGeneratedPdf: r.hasGeneratedPdf ? 'Ano' : 'Ne', hasSignedDocument: r.hasSignedDocument ? 'Ano' : 'Ne' })
    }

    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORTS (CSV)
  // ═══════════════════════════════════════════════════════════════

  async exportOperationalCsv(user: AuthUser, query: Parameters<ReportsService['getOperationalReport']>[1]): Promise<string> {
    const report = await this.getOperationalReport(user, query)
    const ORIGIN_LABELS: Record<string, string> = { manual: 'Manuální', recurring_plan: 'Opakované', mio_finding: 'Mio nález', revision: 'Revize' }
    const headers = ['Typ', 'Název', 'Zdroj', 'Nemovitost', 'Zařízení', 'Zadavatel', 'Dispečer', 'Řešitel', 'Priorita', 'Stav', 'Vytvořeno', 'Termín', 'Dokončeno']
    const allRows = [...report.tickets, ...report.workOrders]
    const rows = allRows.map(r => [
      r.type === 'request' ? 'Požadavek' : 'Úkol',
      r.title,
      ORIGIN_LABELS[(r as any).requestOrigin] ?? 'Manuální',
      r.property ?? '', r.asset ?? '', r.requester ?? '', r.dispatcher ?? '', r.resolver ?? '',
      r.priority, r.status, r.createdAt, r.dueAt ?? '', r.completedAt ?? '',
    ])
    return toCsv(headers, rows)
  }

  async exportAssetCsv(user: AuthUser, query: Parameters<ReportsService['getAssetReport']>[1]): Promise<string> {
    const report = await this.getAssetReport(user, query)
    const headers = ['Zařízení', 'Kategorie', 'Nemovitost', 'Typ', 'Požadavky', 'Úkoly', 'Protokoly', 'Otevřené úkoly', 'Po termínu', 'Celkem zásahů', 'Poslední aktivita']
    const rows = report.rows.map(r => [
      r.name, r.category, r.property ?? '', r.assetType ?? '',
      String(r.requestCount), String(r.workOrderCount), String(r.protocolCount),
      String(r.openWorkOrders), String(r.overdueWorkOrders), String(r.totalInterventions),
      r.lastActivity ?? '',
    ])
    return toCsv(headers, rows)
  }

  async exportProtocolCsv(user: AuthUser, query: Parameters<ReportsService['getProtocolReport']>[1]): Promise<string> {
    const report = await this.getProtocolReport(user, query)
    const headers = ['Číslo', 'Název', 'Typ', 'Stav', 'Nemovitost', 'Řešitel', 'Vytvořeno', 'Dokončeno', 'Předáno', 'Spokojenost', 'PDF', 'Podpis']
    const rows = report.rows.map(r => [
      r.number, r.title ?? '', r.protocolType, r.status, r.property ?? '', r.resolverName ?? '',
      r.createdAt, r.completedAt ?? '', r.handoverAt ?? '', r.satisfaction ?? '',
      r.hasGeneratedPdf ? 'Ano' : 'Ne', r.hasSignedDocument ? 'Ano' : 'Ne',
    ])
    return toCsv(headers, rows)
  }

  async getPropertyReport(user: AuthUser) {
    const tenantId = user.tenantId;
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const propertyFilter = ids !== null ? { id: { in: ids } } : {};

    const properties = await this.prisma.property.findMany({
      where: { tenantId, status: 'active', ...propertyFilter },
      include: {
        units: { select: { id: true, isOccupied: true } },
        prescriptions: {
          where: { status: 'active' },
          select: { amount: true },
        },
        helpdeskTickets: {
          where: { status: { in: ['open', 'in_progress'] } },
          select: { id: true },
        },
        workOrders: {
          where: { status: { in: ['nova', 'v_reseni'] } },
          select: { id: true },
        },
        leaseAgreements: {
          where: { status: 'aktivni' },
          select: { id: true, endDate: true, monthlyRent: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return properties.map((p) => {
      const totalUnits = p.units.length;
      const occupied = p.units.filter((u) => u.isOccupied).length;
      const occupancyPct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
      const monthlyPrescriptions = p.prescriptions.reduce(
        (s, pr) => s + Number(pr.amount),
        0,
      );
      const monthlyRent = p.leaseAgreements.reduce(
        (s, la) => s + Number(la.monthlyRent),
        0,
      );

      return {
        id: p.id,
        name: p.name,
        address: p.address,
        totalUnits,
        occupied,
        occupancyPct,
        monthlyPrescriptions,
        monthlyRent,
        openTickets: p.helpdeskTickets.length,
        openWorkOrders: p.workOrders.length,
        activeLeases: p.leaseAgreements.length,
      };
    });
  }
}
