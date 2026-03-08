import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyReport(user: AuthUser, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const [transactions, prescriptions, residents] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: from, lte: to },
        },
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
        },
        include: {
          property: { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.resident.count({
        where: { tenantId: user.tenantId, isActive: true },
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
}
