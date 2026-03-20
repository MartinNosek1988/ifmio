import { Controller, Get, Post, Patch, Param, Query, Body, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_FINANCE } from '../common/constants/roles.constants'
import { KontoRemindersService } from './konto-reminders.service'
import { KontoService } from './konto.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Konto Reminders')
@ApiBearerAuth()
@Controller('konto-reminders')
export class KontoRemindersController {
  constructor(
    private service: KontoRemindersService,
    private konto: KontoService,
  ) {}

  @Post('generate/:propertyId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Generovat upomínky pro nemovitost' })
  generateReminders(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() body: { minAmount?: number; minDaysOverdue?: number },
  ) {
    return this.service.generateReminders(user.tenantId, propertyId, body)
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Upomínky nemovitosti' })
  getPropertyReminders(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('status') status?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getPropertyReminders(user.tenantId, propertyId, { status, accountId })
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Upomínky konta' })
  async getAccountReminders(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    await this.konto.verifyAccountTenant(user.tenantId, accountId)
    return this.service.getAccountReminders(user.tenantId, accountId)
  }

  @Patch(':reminderId/send')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Odeslat upomínku' })
  markAsSent(
    @CurrentUser() user: AuthUser,
    @Param('reminderId') reminderId: string,
    @Body() body: { method: string },
  ) {
    return this.service.markAsSent(user.tenantId, reminderId, body.method)
  }

  @Patch(':reminderId/resolve')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Označit upomínku jako vyřešenou' })
  markAsResolved(
    @CurrentUser() user: AuthUser,
    @Param('reminderId') reminderId: string,
  ) {
    return this.service.markAsResolved(user.tenantId, reminderId)
  }

  @Patch(':reminderId/cancel')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Zrušit upomínku' })
  cancelReminder(
    @CurrentUser() user: AuthUser,
    @Param('reminderId') reminderId: string,
  ) {
    return this.service.cancelReminder(user.tenantId, reminderId)
  }

  @Get(':reminderId/pdf')
  @ApiOperation({ summary: 'Stáhnout upomínku jako PDF s QR kódem' })
  async reminderPdf(
    @CurrentUser() user: AuthUser,
    @Param('reminderId') reminderId: string,
    @Res() reply: FastifyReply,
  ) {
    const doc = await this.service.generateReminderPdf(user.tenantId, reminderId)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="upominka-${reminderId.slice(0, 8)}.pdf"`)
    return reply.send(doc)
  }
}
