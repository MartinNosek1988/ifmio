import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_FINANCE, ROLES_MANAGE } from '../common/constants/roles.constants'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AccountingExportService } from './accounting-export.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Accounting Export')
@ApiBearerAuth()
@Controller('properties/:propertyId/accounting')
export class AccountingExportController {
  constructor(private service: AccountingExportService) {}

  // ─── Export ─────────────────────────────────────────────────

  @Get('export/pohoda')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Export do Pohoda XML (Windows-1250)' })
  async exportPohoda(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type: string,
    @Query('includeBank') includeBank: string,
    @Query('bankAccountId') bankAccountId: string,
    @Res() reply: FastifyReply,
  ) {
    const buffer = await this.service.exportPohoda(user, {
      propertyId, from, to,
      type: (type as any) ?? 'all',
      includeBankTransactions: includeBank === 'true',
      bankAccountId: bankAccountId || undefined,
    })
    const month = from?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
    reply.header('Content-Type', 'application/xml; charset=windows-1250')
    reply.header('Content-Disposition', `attachment; filename="pohoda_export_${month}.xml"`)
    return reply.send(buffer)
  }

  @Get('export/pohoda/preview')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Náhled Pohoda exportu (počty a částky)' })
  previewPohoda(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type: string,
    @Query('includeBank') includeBank: string,
    @Query('bankAccountId') bankAccountId: string,
  ) {
    return this.service.previewPohoda(user, {
      propertyId, from, to,
      type: (type as any) ?? 'all',
      includeBankTransactions: includeBank === 'true',
      bankAccountId: bankAccountId || undefined,
    })
  }

  @Get('export/money-s3')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Export do Money S3 XML (Windows-1252)' })
  async exportMoneyS3(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type: string,
    @Res() reply: FastifyReply,
  ) {
    const buffer = await this.service.exportMoneyS3(user, { propertyId, from, to, type: (type as any) ?? 'all' })
    reply.header('Content-Type', 'application/xml; charset=windows-1252')
    reply.header('Content-Disposition', 'attachment; filename="ifmio-money-s3-export.xml"')
    return reply.send(buffer)
  }

  // ─── Cost Summary ──────────────────────────────────────────

  @Get('cost-summary')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Přehled nákladů per složka pro vyúčtování' })
  getCostSummary(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('year') year: string,
  ) {
    return this.service.getCostSummary(user, propertyId, parseInt(year) || new Date().getFullYear())
  }

  // ─── Accounting Presets ────────────────────────────────────

  @Get('presets')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Seznam předkontací' })
  listPresets(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.listPresets(user, propertyId)
  }

  @Post('presets')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit předkontaci' })
  createPreset(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: { name: string; transactionType: string; debitAccount: string; creditAccount: string; componentId?: string },
  ) {
    return this.service.createPreset(user, propertyId, dto)
  }

  @Put('presets/:id')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit předkontaci' })
  updatePreset(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.service.updatePreset(user, id, dto)
  }

  @Delete('presets/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat předkontaci' })
  deletePreset(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deletePreset(user, id)
  }

  @Post('presets/seed-defaults')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit výchozí sadu předkontací' })
  seedDefaults(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.seedDefaults(user, propertyId)
  }
}
