import {
  Controller, Get, Post, Put, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { RemindersService } from './reminders.service'
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard'
import { Roles }            from '../common/decorators/roles.decorator'
import { CurrentUser }      from '../common/decorators/current-user.decorator'
import { AuditAction }      from '../common/decorators/audit.decorator'
import { ROLES_FINANCE } from '../common/constants/roles.constants'
import { ReminderListQueryDto, CreateReminderDto, BulkCreateRemindersDto, UpdateTemplateDto } from './dto/reminders.dto'
import type { AuthUser }    from '@ifmio/shared-types'

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private service: RemindersService) {}

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'Šablony upomínek' })
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.service.listTemplates(user)
  }

  @Post('templates/seed')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvoř výchozí šablony' })
  seedTemplates(@CurrentUser() user: AuthUser) {
    return this.service.seedDefaultTemplates(user)
  }

  @Put('templates/:id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('ReminderTemplate', 'UPDATE')
  @ApiOperation({ summary: 'Upravit šablonu' })
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.service.updateTemplate(user, id, dto)
  }

  // Debtors
  @Get('debtors')
  @ApiOperation({ summary: 'Seznam dlužníků s aging buckets' })
  listDebtors(@CurrentUser() user: AuthUser) {
    return this.service.listDebtors(user)
  }

  // Reminders
  @Get()
  @ApiOperation({ summary: 'Seznam upomínek' })
  listReminders(@CurrentUser() user: AuthUser, @Query() query: ReminderListQueryDto) {
    return this.service.listReminders(user, query)
  }

  @Post()
  @Roles(...ROLES_FINANCE)
  @AuditAction('Reminder', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit upomínku' })
  createReminder(@CurrentUser() user: AuthUser, @Body() dto: CreateReminderDto) {
    return this.service.createReminder(user, dto)
  }

  @Post('bulk')
  @Roles(...ROLES_FINANCE)
  @AuditAction('Reminder', 'BULK_CREATE')
  @ApiOperation({ summary: 'Hromadné vytvoření upomínek' })
  bulkCreate(@CurrentUser() user: AuthUser, @Body() dto: BulkCreateRemindersDto) {
    return this.service.bulkCreateReminders(user, dto)
  }

  @Patch(':id/send')
  @Roles(...ROLES_FINANCE)
  @AuditAction('Reminder', 'SEND')
  @ApiOperation({ summary: 'Označit jako odeslanou' })
  markAsSent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markAsSent(user, id)
  }

  @Patch(':id/paid')
  @Roles(...ROLES_FINANCE)
  @AuditAction('Reminder', 'PAID')
  @ApiOperation({ summary: 'Označit jako uhrazenou' })
  markAsPaid(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markAsPaid(user, id)
  }

  @Get('templates/:templateId/render/:residentId')
  @ApiOperation({ summary: 'Náhled šablony s daty residenta' })
  renderTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId') templateId: string,
    @Param('residentId') residentId: string,
  ) {
    return this.service.renderTemplate(user, templateId, residentId)
  }
}
