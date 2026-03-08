import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('monthly')
  @Roles('owner', 'admin')
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
  @Roles('owner', 'admin')
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
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Roční přehled' })
  getYearly(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
  ) {
    const y = Number(year) || new Date().getFullYear();
    return this.service.getYearlyOverview(user, y);
  }
}
