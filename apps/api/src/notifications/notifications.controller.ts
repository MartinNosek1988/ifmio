import {
  Controller, Get, Patch,
  Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'

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
  list(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unread?: string,
  ) {
    return this.service.list(user, unread === 'true')
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
}
