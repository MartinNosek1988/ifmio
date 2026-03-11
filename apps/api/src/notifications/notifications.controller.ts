import {
  Controller, Get, Post, Patch, Delete,
  Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'

interface AuthUser {
  id: string
  tenantId: string
  role: string
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam notifikaci' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  list(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unread?: string,
    @Query('type') type?: string,
  ) {
    return this.service.list(user, unread === 'true', type)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Pocet neprectenych notifikaci' })
  async unreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.service.unreadCount(user)
    return { count }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Oznacit notifikaci jako prectenou' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.markRead(user, id)
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Oznacit vse jako prectene' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Smazat notifikaci' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.remove(user, id)
  }

  @Post('generate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Generovat automaticke notifikace (cron trigger)' })
  generate(@CurrentUser() user: AuthUser) {
    return this.service.generateAutoNotifications(user.tenantId)
  }
}
