import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from '../finance/components/components.service';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class FundOpravService {
  constructor(
    private prisma: PrismaService,
    private components: ComponentsService,
  ) {}

  /** Get all FUND-type components for a property */
  private async getFundComponents(tenantId: string, propertyId: string) {
    return this.prisma.prescriptionComponent.findMany({
      where: { tenantId, propertyId, componentType: 'FUND', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Fund overview: balance, contributions, expenses for each fund component */
  async getOverview(user: AuthUser, propertyId: string, year?: number) {
    const yr = year ?? new Date().getFullYear();
    const funds = await this.getFundComponents(user.tenantId, propertyId);
    if (funds.length === 0) return { funds: [], totalBalance: 0 };

    const results = await Promise.all(
      funds.map(async (fund) => {
        const summary = await this.components.getFundSummary(fund.id, yr, user.tenantId);
        return {
          componentId: fund.id,
          name: fund.name,
          code: fund.code,
          balance: summary.stavDo,
          balanceAtYearStart: summary.stavOd,
          totalContributions: summary.prijmyPredpisy + summary.prijmyOstatni,
          totalExpenses: Math.abs(summary.vydaje),
          prescriptionMonthly: Number(fund.defaultAmount),
        };
      }),
    );

    return {
      funds: results,
      totalBalance: results.reduce((s, f) => s + f.balance, 0),
    };
  }

  // TODO: For large portfolios (1000+ entries) refactor to DB-level UNION query
  /** Ledger entries for a fund component */
  async getEntries(user: AuthUser, propertyId: string, page = 1, limit = 50) {
    const funds = await this.getFundComponents(user.tenantId, propertyId);
    if (funds.length === 0) return { data: [], total: 0, page, pageSize: limit, totalPages: 0 };

    const componentIds = funds.map(f => f.id);

    // Fetch ALL entries (no skip/take) to merge correctly, then paginate
    const [incomeItems, expenseItems] = await Promise.all([
      this.prisma.prescriptionItem.findMany({
        where: { componentId: { in: componentIds } },
        include: {
          prescription: { select: { id: true, description: true, validFrom: true } },
        },
      }),
      this.prisma.invoiceCostAllocation.findMany({
        where: { componentId: { in: componentIds }, invoice: { deletedAt: null } },
        include: {
          invoice: { select: { number: true, supplierName: true, issueDate: true, description: true } },
        },
      }),
    ]);

    // Merge and sort
    const allEntries = [
      ...incomeItems.map(i => ({
        id: i.id,
        type: 'CONTRIBUTION' as const,
        amount: Number(i.amount),
        date: i.prescription?.validFrom?.toISOString() ?? i.createdAt.toISOString(),
        description: `Předpis: ${i.name}`,
        source: i.prescription?.description ?? null,
      })),
      ...expenseItems.map(e => ({
        id: e.id,
        type: 'EXPENSE' as const,
        amount: -Math.abs(Number(e.amount)),
        date: e.invoice?.issueDate?.toISOString() ?? e.createdAt.toISOString(),
        description: `${e.invoice?.supplierName ?? ''}: ${e.invoice?.description ?? ''}`.trim(),
        source: e.invoice?.number ?? null,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = allEntries.length;
    const skip = (page - 1) * limit;
    const data = allEntries.slice(skip, skip + limit);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  /** Annual report data for a fund */
  async getReport(user: AuthUser, propertyId: string, year: number) {
    const funds = await this.getFundComponents(user.tenantId, propertyId);
    if (funds.length === 0) throw new NotFoundException('Žádný fond oprav pro tuto nemovitost');

    return Promise.all(
      funds.map(async (fund) => ({
        componentId: fund.id,
        name: fund.name,
        year,
        summary: await this.components.getFundSummary(fund.id, year, user.tenantId),
      })),
    );
  }

  /** Per-owner fund contribution and expense share */
  async getPerOwner(user: AuthUser, propertyId: string, year: number) {
    const funds = await this.getFundComponents(user.tenantId, propertyId);
    if (funds.length === 0) return [];

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // Get all units with ownership
    const units = await this.prisma.unit.findMany({
      where: { propertyId },
      select: {
        id: true, name: true, area: true,
        unitOwnerships: {
          where: { isActive: true },
          include: { party: { select: { id: true, displayName: true } } },
          take: 1,
        },
      },
    });

    const totalArea = units.reduce((s, u) => s + (u.area ? Number(u.area) : 0), 0);
    const componentIds = funds.map(f => f.id);

    // Total fund expenses for year
    const expenseAgg = await this.prisma.invoiceCostAllocation.aggregate({
      where: { componentId: { in: componentIds }, invoice: { issueDate: { gte: yearStart, lte: yearEnd }, deletedAt: null } },
      _sum: { amount: true },
    });
    const totalExpenses = expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0;

    // Total fund balance
    const totalBalance = await Promise.all(
      funds.map(f => this.components.calculateFundBalance(f.id, yearEnd, user.tenantId)),
    ).then(bs => bs.reduce((s, b) => s + b, 0));

    return units.map(unit => {
      const area = unit.area ? Number(unit.area) : 0;
      const sharePercent = totalArea > 0 ? (area / totalArea) * 100 : 0;
      const owner = unit.unitOwnerships[0]?.party;

      return {
        unitId: unit.id,
        unitName: unit.name,
        partyId: owner?.id ?? null,
        partyName: owner?.displayName ?? 'Neznámý vlastník',
        area,
        sharePercent: Math.round(sharePercent * 100) / 100,
        expenseShare: Math.round((totalExpenses * sharePercent / 100) * 100) / 100,
        balanceShare: Math.round((totalBalance * sharePercent / 100) * 100) / 100,
      };
    });
  }
}
