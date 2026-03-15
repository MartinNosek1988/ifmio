import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MioService } from './mio.service'
import { MioFindingsService } from './mio-findings.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Mio')
@ApiBearerAuth()
@Controller('mio')
export class MioController {
  constructor(
    private service: MioService,
    private findings: MioFindingsService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Mio AI chat' })
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() dto: { messages: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    const response = await this.service.chat(user, dto.messages ?? [])
    return { response }
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
}
