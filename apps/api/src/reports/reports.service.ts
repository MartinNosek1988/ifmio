import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import * as ExcelJS from 'exceljs';
import type { AuthUser } from '@ifmio/shared-types';

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
