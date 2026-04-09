import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MassMailingService } from './mass-mailing.service'
import { CreateCampaignDto, UpdateCampaignDto, ScheduleCampaignDto } from './dto/campaign.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_FINANCE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('MassMailing')
@ApiBearerAuth()
@Controller('mass-mailing')
export class MassMailingController {
  constructor(private service: MassMailingService) {}

  @Get()
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Seznam kampaní' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { status, propertyId, page: page ? +page : undefined, limit: limit ? +limit : undefined })
  }

  @Get('stats')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Statistiky kampaní' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.stats(user)
  }

  @Get(':id')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Detail kampaně' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_FINANCE)
  @AuditAction('massMailingCampaign', 'create')
  @ApiOperation({ summary: 'Vytvořit kampaň' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('massMailingCampaign', 'update')
  @ApiOperation({ summary: 'Upravit kampaň' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Smazat kampaň' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  @Post(':id/preview')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Náhled příjemců' })
  previewRecipients(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.previewRecipients(user, id)
  }

  @Post(':id/send')
  @Roles(...ROLES_FINANCE)
  @AuditAction('massMailingCampaign', 'send')
  @ApiOperation({ summary: 'Odeslat kampaň' })
  sendCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.sendCampaign(user, id)
  }

  @Post(':id/schedule')
  @Roles(...ROLES_FINANCE)
  @AuditAction('massMailingCampaign', 'schedule')
  @ApiOperation({ summary: 'Naplánovat kampaň' })
  scheduleCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.service.scheduleCampaign(user, id, dto.scheduledAt)
  }

  @Post(':id/cancel')
  @Roles(...ROLES_FINANCE)
  @AuditAction('massMailingCampaign', 'cancel')
  @ApiOperation({ summary: 'Zrušit kampaň' })
  cancelCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancelCampaign(user, id)
  }

  @Get(':id/recipients')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Seznam příjemců kampaně' })
  getRecipients(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecipients(user, id, { status, page: page ? +page : undefined, limit: limit ? +limit : undefined })
  }
}
