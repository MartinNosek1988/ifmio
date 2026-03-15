import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { MioService } from './mio.service'
import { MioFindingsService } from './mio-findings.service'
import { MioConfigService } from './mio-config.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Mio')
@ApiBearerAuth()
@Controller('mio')
export class MioController {
  constructor(
    private service: MioService,
    private findings: MioFindingsService,
    private config: MioConfigService,
  ) {}

  // ─── Config (governance) ────────────────────────────────────

  @Get('config')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Mio governance config' })
  getConfig(@CurrentUser() user: AuthUser) {
    return this.config.getConfig(user.tenantId)
  }

  @Get('config/meta')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Mio governance metadata (labels, bounds, defaults)' })
  getConfigMeta() {
    return this.config.getMeta()
  }

  @Get('config/defaults')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Mio governance default config' })
  getConfigDefaults() {
    return this.config.getDefaults()
  }

  @Put('config')
  @Roles(...ROLES_MANAGE)
  @AuditAction('TenantSettings', 'MIO_CONFIG_UPDATE')
  @ApiOperation({ summary: 'Update Mio governance config' })
  updateConfig(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.config.updateConfig(user.tenantId, dto)
  }

  @Post('config/reset')
  @Roles(...ROLES_MANAGE)
  @AuditAction('TenantSettings', 'MIO_CONFIG_RESET')
  @ApiOperation({ summary: 'Reset Mio config (full or section)' })
  resetConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: { section?: string },
  ) {
    return this.config.resetConfig(user.tenantId, dto?.section)
  }

  @Post('chat')
  @ApiOperation({ summary: 'Mio AI chat' })
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() dto: { messages: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    const response = await this.service.chat(user, dto.messages ?? [])
    return { response }
  }

  // ─── Insights (unified) ─────────────────────────────────────

  @Get('insights')
  @ApiOperation({ summary: 'Sjednocený seznam findings + recommendations' })
  listInsights(
    @CurrentUser() user: AuthUser,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('hasTicket') hasTicket?: string,
  ) {
    return this.findings.listInsights(user, { kind, status, severity, category, search, hasTicket })
  }

  @Get('insights/summary')
  @ApiOperation({ summary: 'Souhrn insights' })
  insightsSummary(@CurrentUser() user: AuthUser) {
    return this.findings.getInsightsSummary(user)
  }

  @Post('insights/:id/dismiss')
  @ApiOperation({ summary: 'Skrýt insight' })
  dismissInsight(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.dismiss(user, id)
  }

  @Post('insights/:id/snooze')
  @ApiOperation({ summary: 'Odložit insight' })
  snoozeInsight(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { until: string },
  ) {
    return this.findings.snooze(user, id, new Date(dto.until))
  }

  @Post('insights/:id/restore')
  @ApiOperation({ summary: 'Obnovit skrytý/odložený insight' })
  restoreInsight(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.restore(user, id)
  }

  // ─── Findings ───────────────────────────────────────────────

  @Get('findings')
  @ApiOperation({ summary: 'Seznam Mio findings' })
  listFindings(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.findings.listFindings(user, { status, severity })
  }

  @Get('findings/summary')
  @ApiOperation({ summary: 'Souhrn findings' })
  findingsSummary(@CurrentUser() user: AuthUser) {
    return this.findings.getSummary(user)
  }

  @Post('findings/:id/dismiss')
  @ApiOperation({ summary: 'Skrýt finding' })
  dismiss(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.dismiss(user, id)
  }

  @Post('findings/:id/snooze')
  @ApiOperation({ summary: 'Odložit finding' })
  snooze(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { until: string },
  ) {
    return this.findings.snooze(user, id, new Date(dto.until))
  }

  @Post('findings/:id/create-ticket')
  @ApiOperation({ summary: 'Vytvořit ticket z findingu' })
  createTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.createTicketManual(user, id)
  }

  @Post('findings/run-detection')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Ručně spustit detekci pro můj tenant' })
  runDetection(@CurrentUser() user: AuthUser) {
    return this.findings.runDetectionForUser(user)
  }

  // ─── Recommendations ───────────────────────────────────────

  @Get('recommendations')
  @ApiOperation({ summary: 'Seznam Mio doporučení' })
  listRecommendations(@CurrentUser() user: AuthUser) {
    return this.findings.listRecommendations(user)
  }

  @Get('recommendations/summary')
  @ApiOperation({ summary: 'Souhrn doporučení' })
  recommendationsSummary(@CurrentUser() user: AuthUser) {
    return this.findings.getRecommendationSummary(user)
  }

  @Post('recommendations/:id/dismiss')
  @ApiOperation({ summary: 'Skrýt doporučení' })
  dismissRecommendation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.findings.dismiss(user, id)
  }

  @Post('recommendations/:id/snooze')
  @ApiOperation({ summary: 'Odložit doporučení' })
  snoozeRecommendation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { until: string },
  ) {
    return this.findings.snooze(user, id, new Date(dto.until))
  }
}
