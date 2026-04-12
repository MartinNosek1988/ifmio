import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CalendarService } from './calendar.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import { CalendarEventDto, CalendarStatsDto } from './calendar.dto'
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private service: CalendarService) {}

  @Get('events')
  @ApiOperation({ summary: 'Události kalendáře (vlastní + agregované)' })
  events(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
    @Query('search') search?: string,
    @Query('propertyId') propertyId?: string,
  ): Promise<CalendarEventDto[]> {
    return this.service.getEvents(user, { from, to, eventType, search, propertyId })
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky kalendáře' })
  stats(@CurrentUser() user: AuthUser): Promise<CalendarStatsDto> {
    return this.service.getStats(user)
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Detail události' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<CalendarEventDto> {
    return this.service.getById(user, id)
  }

  @Post('events')
  @Roles(...ROLES_OPS)
  @AuditAction('calendarEvent', 'create')
  @ApiOperation({ summary: 'Vytvořit událost' })
  create(@CurrentUser() user: AuthUser, @Body() dto: {
    title: string
    eventType?: string
    date: string
    dateTo?: string
    timeFrom?: string
    timeTo?: string
    propertyId?: string
    location?: string
    description?: string
    attendees?: string[]
  }): Promise<CalendarEventDto> {
    return this.service.create(user, dto)
  }

  @Put('events/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('calendarEvent', 'update')
  @ApiOperation({ summary: 'Upravit událost' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      title?: string
      eventType?: string
      date?: string
      dateTo?: string
      timeFrom?: string
      timeTo?: string
      propertyId?: string
      location?: string
      description?: string
      attendees?: string[]
    },
  ): Promise<CalendarEventDto> {
    return this.service.update(user, id, dto)
  }

  @Delete('events/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('calendarEvent', 'delete')
  @ApiOperation({ summary: 'Smazat událost' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ success: boolean }> {
    return this.service.remove(user, id)
  }
}
