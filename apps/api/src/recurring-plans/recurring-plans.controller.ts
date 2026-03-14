import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS, ROLES_MANAGE } from '../common/constants/roles.constants'
import { RecurringPlansService } from './recurring-plans.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Recurring Plans')
@ApiBearerAuth()
@Controller('recurring-plans')
export class RecurringPlansController {
  constructor(private service: RecurringPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam opakovaných plánů' })
  list(@CurrentUser() user: AuthUser, @Query('assetId') assetId?: string, @Query('isActive') isActive?: string) {
    return this.service.list(user, { assetId, isActive })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail plánu' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_OPS)
  @AuditAction('RecurringActivityPlan', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit opakovaný plán' })
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('RecurringActivityPlan', 'UPDATE')
  @ApiOperation({ summary: 'Upravit plán' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('RecurringActivityPlan', 'DELETE')
  @ApiOperation({ summary: 'Smazat plán' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  @Post('generate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Ručně spustit generování požadavků' })
  generate() {
    return this.service.generatePendingTickets()
  }
}
