import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CommunicationService } from './communication.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Communication')
@ApiBearerAuth()
@Controller('communication')
export class CommunicationController {
  constructor(private service: CommunicationService) {}

  @Post('send')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Odeslat zprávu více kanály' })
  send(
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      channels: string[]
      recipient: {
        name?: string; email?: string; phone?: string
        dataBoxId?: string; address?: { name: string; street: string; city: string; zip: string }
      }
      subject: string
      bodyText: string
      bodyHtml?: string
    },
  ) {
    return this.service.sendMessage(user.tenantId, dto.channels, {
      recipient: dto.recipient,
      subject: dto.subject,
      bodyText: dto.bodyText,
      bodyHtml: dto.bodyHtml,
    })
  }

  @Get('channels')
  @ApiOperation({ summary: 'Dostupné komunikační kanály' })
  channels() {
    return this.service.getChannelStatuses()
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Historie odeslaných zpráv' })
  outbox(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.service.getOutboxLogs(user.tenantId, limit ? parseInt(limit) : 50)
  }
}
