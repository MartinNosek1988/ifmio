import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { AssetPlanInstantiationService } from '../asset-types/asset-plan-instantiation.service';
import { AssetPassportService } from './asset-passport.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_OPS } from '../common/constants/roles.constants';
import type { Response } from 'express';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(
    private service: AssetsService,
    private instantiation: AssetPlanInstantiationService,
    private passport: AssetPassportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Seznam aktiv' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.service.list(user, { search, category, status, propertyId });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky aktiv' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const csv = await this.service.exportCsv(user);
    res.setHeader('Content-Disposition', 'attachment; filename=assets.csv');
    res.send('\uFEFF' + csv); // BOM for Excel
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail aktiva' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Vytvořit aktivum' })
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.service.create(user, body as any);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Upravit aktivum' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Smazat aktivum (soft delete)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get(':id/services')
  @ApiOperation({ summary: 'Servisní záznamy aktiva' })
  getServiceRecords(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getServiceRecords(user, id);
  }

  @Post(':id/services')
  @ApiOperation({ summary: 'Přidat servisní záznam' })
  addServiceRecord(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { date: string; type: string; description?: string; cost?: number; supplier?: string },
  ) {
    return this.service.addServiceRecord(user, id, body);
  }

  // ─── Plan Sync ────────────────────────────────────────────────

  @Get(':id/sync-plans/preview')
  @ApiOperation({ summary: 'Náhled synchronizace plánů činností' })
  syncPlansPreview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.instantiation.previewSync(id, user.tenantId);
  }

  @Post(':id/sync-plans')
  @Roles(...ROLES_OPS)
  @ApiOperation({ summary: 'Synchronizovat plány činností z typu zařízení' })
  syncPlans(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { skipCustomized?: boolean },
  ) {
    return this.instantiation.executeSyncPlans(id, user.tenantId, {
      skipCustomized: body.skipCustomized !== false,
      actorId: user.id,
    });
  }

  // ─── Passport ─────────────────────────────────────────────────

  @Get(':id/passport')
  @ApiOperation({ summary: 'Asset passport — přehled zařízení' })
  getPassport(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.passport.getPassport(user, id);
  }

  @Get(':id/revision-history')
  @ApiOperation({ summary: 'Historie revizí aktiva' })
  getRevisionHistory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.passport.getRevisionHistory(user, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id/audit-events')
  @ApiOperation({ summary: 'Audit timeline aktiva' })
  getAuditEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.passport.getAuditEvents(user, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
