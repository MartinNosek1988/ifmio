import { Controller, Get, Post, Query, Body, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { FundSettlementService } from './fund-settlement.service';
import { CostsReportService } from './costs-report.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_FINANCE_DRAFT, ROLES_MANAGE } from '../common/constants/roles.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private service: ReportsService,
    private scheduled: ScheduledReportsService,
    private fundSettlement: FundSettlementService,
    private costsReport: CostsReportService,
  ) {}

  @Get('monthly')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Měsíční report (JSON)' })
  getMonthly(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = Number(year) || now.getFullYear();
    const m = Number(month) || now.getMonth() + 1;
    return this.service.getMonthlyReport(user, y, m);
  }

  @Get('monthly/export')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Měsíční report — XLSX export' })
  async exportMonthly(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Res() reply?: FastifyReply,
  ) {
    const now = new Date();
    const y = Number(year) || now.getFullYear();
    const m = Number(month) || now.getMonth() + 1;

    const buffer = await this.service.exportMonthlyXlsx(user, y, m);
    const filename = `report_${y}-${String(m).padStart(2, '0')}.xlsx`;

    reply!
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Get('yearly')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Roční přehled' })
  getYearly(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
  ) {
    const y = Number(year) || new Date().getFullYear();
    return this.service.getYearlyOverview(user, y);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPI přehled' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.service.getDashboardKpi(user);
  }

  @Get('properties')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Report nemovitostí' })
  getProperties(@CurrentUser() user: AuthUser) {
    return this.service.getPropertyReport(user);
  }

  // ─── Operational report ────────────────────────────────────

  @Get('operations')
  @ApiOperation({ summary: 'Provozní report (Helpdesk + WO)' })
  getOperations(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('onlyOverdue') onlyOverdue?: string,
  ) {
    return this.service.getOperationalReport(user, { propertyId, dateFrom, dateTo, priority, status, assetId, onlyOverdue });
  }

  @Get('operations/export')
  @ApiOperation({ summary: 'Export provozního reportu (XLSX/CSV)' })
  async exportOperations(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('onlyOverdue') onlyOverdue?: string,
    @Query('format') format?: string,
    @Res() reply?: FastifyReply,
  ) {
    const q = { propertyId, dateFrom, dateTo, priority, status, assetId, onlyOverdue };
    if (format === 'csv') {
      const csv = await this.service.exportOperationalCsv(user, q);
      return reply!.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="provozni-report.csv"').send(csv);
    }
    const buffer = await this.service.exportOperationalXlsx(user, q);
    reply!.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', 'attachment; filename="provozni-report.xlsx"').send(buffer);
  }

  // ─── Asset report ──────────────────────────────────────────

  @Get('assets')
  @ApiOperation({ summary: 'Technický report zařízení' })
  getAssets(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('assetId') assetId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getAssetReport(user, { propertyId, assetId, dateFrom, dateTo });
  }

  @Get('assets/export')
  @ApiOperation({ summary: 'Export technického reportu zařízení (XLSX/CSV)' })
  async exportAssets(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('assetId') assetId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('format') format?: string,
    @Res() reply?: FastifyReply,
  ) {
    const q = { propertyId, assetId, dateFrom, dateTo };
    if (format === 'csv') {
      const csv = await this.service.exportAssetCsv(user, q);
      return reply!.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="zarizeni-report.csv"').send(csv);
    }
    const buffer = await this.service.exportAssetXlsx(user, q);
    reply!.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', 'attachment; filename="zarizeni-report.xlsx"').send(buffer);
  }

  // ─── Protocol report ───────────────────────────────────────

  @Get('protocols')
  @ApiOperation({ summary: 'Registr protokolů' })
  getProtocols(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('protocolType') protocolType?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getProtocolReport(user, { propertyId, dateFrom, dateTo, protocolType, status });
  }

  @Get('protocols/export')
  @ApiOperation({ summary: 'Export registru protokolů (XLSX/CSV)' })
  async exportProtocols(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('protocolType') protocolType?: string,
    @Query('status') status?: string,
    @Query('format') format?: string,
    @Res() reply?: FastifyReply,
  ) {
    const q = { propertyId, dateFrom, dateTo, protocolType, status };
    if (format === 'csv') {
      const csv = await this.service.exportProtocolCsv(user, q);
      return reply!.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="protokoly-report.csv"').send(csv);
    }
    const buffer = await this.service.exportProtocolXlsx(user, q);
    reply!
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="protokoly-report.xlsx"')
      .send(buffer);
  }

  // ─── Fund settlement (Vyúčtování fondu) ───────────────────

  @Get('fund-settlement')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Vyúčtování fondu per-vlastník (PDF/JSON)' })
  async getFundSettlement(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId: string,
    @Query('componentId') componentId: string,
    @Query('year') year: string,
    @Query('unitIds') unitIds?: string,
    @Query('format') format?: string,
    @Res() reply?: FastifyReply,
  ) {
    const yearNum = parseInt(year, 10)
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('Neplatný rok — očekáváno číslo mezi 2000 a 2100')
    }

    const params = {
      propertyId,
      componentId,
      year: yearNum,
      unitIds: unitIds ? unitIds.split(',') : undefined,
    }

    const data = await this.fundSettlement.generateData(user, params)

    if (format === 'json') {
      return reply!.send(data)
    }

    const buffer = await this.fundSettlement.generatePdf(data)
    reply!
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="vyuctovani-fondu-${params.year}.pdf"`)
      .send(buffer)
  }

  // ─── Costs by folder ───────────────────────────────────────

  @Get('costs-by-folder')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Náklady dle složek (PDF/JSON)' })
  async getCostsByFolder(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId: string,
    @Query('year') year: string,
    @Query('format') format?: string,
    @Res() reply?: FastifyReply,
  ) {
    const yearNum = parseInt(year, 10)
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('Neplatný rok — očekáváno číslo mezi 2000 a 2100')
    }

    const data = await this.costsReport.generateData(user, {
      propertyId,
      year: yearNum,
    })

    if (format === 'json') {
      return reply!.send(data)
    }

    const buffer = await this.costsReport.generatePdf(data)
    reply!
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="naklady-dle-slozek-${year}.pdf"`)
      .send(buffer)
  }

  // ─── Scheduled report subscriptions ────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'Moje odběry reportů' })
  getSubscriptions(@CurrentUser() user: AuthUser) {
    return this.scheduled.listSubscriptions(user);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Vytvořit/upravit odběr reportu' })
  upsertSubscription(
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      reportType: string
      frequency?: string
      format?: string
      propertyId?: string | null
      isEnabled?: boolean
    },
  ) {
    return this.scheduled.upsertSubscription(user, dto);
  }

  // ─── Manual trigger (admin only) ───────────────────────────

  @Post('send-digests')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Odeslat denní přehledy (ruční spuštění)' })
  sendDigests() {
    return this.scheduled.sendDailyDigests();
  }
}
