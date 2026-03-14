import {
  Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FieldChecksService } from './field-checks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_OPS } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';
import { CreateFieldCheckDto, LogScanEventDto } from './dto/create-field-check.dto';

@Controller()
export class FieldChecksController {
  constructor(private readonly svc: FieldChecksService) {}

  /* ─── POST /assets/:id/scan-events ────────────────────────────── */

  @Post('assets/:id/scan-events')
  @HttpCode(HttpStatus.CREATED)
  async logScanEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Body() body: unknown,
  ) {
    const dto = LogScanEventDto.parse(body);
    return this.svc.logScanEvent(user, assetId, dto);
  }

  /* ─── GET /assets/:id/scan-events ─────────────────────────────── */

  @Get('assets/:id/scan-events')
  async listScanEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listScanEvents(user, assetId, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  /* ─── POST /assets/:id/field-checks ───────────────────────────── */

  @Post('assets/:id/field-checks')
  @Roles(...ROLES_OPS)
  @HttpCode(HttpStatus.CREATED)
  async createFieldCheck(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Query('scanEventId') scanEventId: string | undefined,
    @Body() body: unknown,
  ) {
    const dto = CreateFieldCheckDto.parse(body);
    return this.svc.createFieldCheck(user, assetId, scanEventId, dto);
  }

  /* ─── GET /assets/:id/field-checks ────────────────────────────── */

  @Get('assets/:id/field-checks')
  async listFieldChecks(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listForAsset(user, assetId, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  /* ─── GET /field-checks/:checkId ──────────────────────────────── */

  @Get('field-checks/:checkId')
  async getFieldCheck(
    @CurrentUser() user: AuthUser,
    @Param('checkId') checkId: string,
  ) {
    return this.svc.getFieldCheck(user, checkId);
  }
}
