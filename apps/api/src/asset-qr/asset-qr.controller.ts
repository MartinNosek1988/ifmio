import {
  Controller, Get, Post, Param, Body, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AssetQrService } from './asset-qr.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_OPS } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';

@Controller()
export class AssetQrController {
  constructor(private readonly svc: AssetQrService) {}

  /* ─── GET /assets/:id/qr ─────────────────────────────────────── */

  @Get('assets/:id/qr')
  async getActiveQr(@CurrentUser() user: AuthUser, @Param('id') assetId: string) {
    const qr = await this.svc.getActiveQr(user, assetId);
    return qr ?? { active: false };
  }

  /* ─── POST /assets/:id/qr ────────────────────────────────────── */

  @Post('assets/:id/qr')
  @Roles(...ROLES_OPS)
  @HttpCode(HttpStatus.OK)
  async createOrGetQr(@CurrentUser() user: AuthUser, @Param('id') assetId: string) {
    return this.svc.createOrGetQr(user, assetId);
  }

  /* ─── POST /assets/:id/qr/reissue ───────────────────────────── */

  @Post('assets/:id/qr/reissue')
  @Roles(...ROLES_OPS)
  @HttpCode(HttpStatus.OK)
  async reissue(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Body() body: { notes?: string },
  ) {
    return this.svc.reissue(user, assetId, body.notes);
  }

  /* ─── POST /assets/:id/qr/mark-printed ─────────────────────── */

  @Post('assets/:id/qr/mark-printed')
  @Roles(...ROLES_OPS)
  @HttpCode(HttpStatus.OK)
  async markPrinted(@CurrentUser() user: AuthUser, @Param('id') assetId: string) {
    return this.svc.markPrinted(user, assetId);
  }

  /* ─── GET /assets/:id/qr/history ────────────────────────────── */

  @Get('assets/:id/qr/history')
  async getHistory(@CurrentUser() user: AuthUser, @Param('id') assetId: string) {
    return this.svc.getHistory(user, assetId);
  }

  /* ─── GET /assets/:id/qr/label.pdf ──────────────────────────── */

  @Get('assets/:id/qr/label.pdf')
  async downloadLabel(
    @CurrentUser() user: AuthUser,
    @Param('id') assetId: string,
    @Res() res: FastifyReply,
  ) {
    const { buffer, filename } = await this.svc.generateLabelPdf(user, assetId);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Content-Length', buffer.length)
      .send(buffer);
  }

  /* ─── GET /qr/:token ─────────────────────────────────────────── */
  // Public endpoint — resolves token to assetId for QR scan flow.
  // Authentication happens at the /assets/:id page (frontend route guard).

  @Public()
  @Get('qr/:token')
  async resolveToken(@Param('token') token: string) {
    return this.svc.resolveToken(token);
  }
}
