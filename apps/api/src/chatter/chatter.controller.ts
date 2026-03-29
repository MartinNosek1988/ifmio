import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatterService } from './chatter.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Chatter')
@ApiBearerAuth()
@Controller()
export class ChatterController {
  constructor(private service: ChatterService) {}

  // ─── THREAD ───────────────────────────────────────────────────

  @Get('chatter/:entityType/:entityId')
  @ApiOperation({ summary: 'Thread zpráv + aktivity pro entitu' })
  async getThread(
    @CurrentUser() user: AuthUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const [messages, activities] = await Promise.all([
      this.service.getThread(user.tenantId, entityType, entityId),
      this.service.getActivities(user.tenantId, entityType, entityId),
    ]);
    return { messages, activities };
  }

  @Post('chatter/:entityType/:entityId/messages')
  @ApiOperation({ summary: 'Přidat zprávu' })
  addMessage(
    @CurrentUser() user: AuthUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.service.addMessage(user.tenantId, entityType, entityId, dto.body, user.id, dto.mentionUserIds);
  }

  // ─── ACTIVITIES ───────────────────────────────────────────────

  @Get('activities/my')
  @ApiOperation({ summary: 'Moje aktivity (dashboard widget)' })
  getMyActivities(@CurrentUser() user: AuthUser) {
    return this.service.getMyActivities(user.tenantId, user.id);
  }

  @Get('activities/:entityType/:entityId')
  @ApiOperation({ summary: 'Aktivity pro entitu' })
  getActivities(
    @CurrentUser() user: AuthUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.getActivities(user.tenantId, entityType, entityId);
  }

  @Post('activities/:entityType/:entityId')
  @ApiOperation({ summary: 'Vytvořit aktivitu' })
  createActivity(
    @CurrentUser() user: AuthUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.service.createActivity(user.tenantId, entityType, entityId, dto);
  }

  @Patch('activities/:activityId/complete')
  @ApiOperation({ summary: 'Označit aktivitu jako hotovou' })
  completeActivity(
    @CurrentUser() user: AuthUser,
    @Param('activityId') activityId: string,
  ) {
    return this.service.completeActivity(user.tenantId, activityId, user.id);
  }

  @Get('activity-types')
  @ApiOperation({ summary: 'Seznam typů aktivit pro tenant' })
  getActivityTypes(@CurrentUser() user: AuthUser) {
    return this.service.getOrCreateDefaultActivityTypes(user.tenantId);
  }
}
