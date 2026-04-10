import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { BoardMessagesService } from './board-messages.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_WRITE, ROLES_MANAGE } from '../common/constants/roles.constants'
import { CreateBoardMessageDto, CreateBoardMessageBodyDto, UpdateBoardMessageDto, ReviewBoardMessageDto } from './dto/board-message.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Board Messages')
@ApiBearerAuth()
@Controller('properties/:propertyId/board-messages')
export class BoardMessagesController {
  constructor(private service: BoardMessagesService) {}

  @Get()
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Seznam zpráv na nástěnce' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      user,
      propertyId,
      { status, search },
      { page: Number(page) || 1, limit: Number(limit) || 20 },
    )
  }

  @Get('pending-count')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Počet zpráv čekajících na schválení' })
  getPendingCount(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.service.getPendingCount(user, propertyId)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('BoardMessage', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit zprávu na nástěnku' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() body: CreateBoardMessageBodyDto,
  ) {
    const dto: CreateBoardMessageDto = { ...body, propertyId }
    return this.service.create(user, dto)
  }

  @Get(':id')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Detail zprávy' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.findOne(user, id)
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('BoardMessage', 'UPDATE')
  @ApiOperation({ summary: 'Upravit zprávu' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBoardMessageDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Post(':id/review')
  @Roles(...ROLES_MANAGE)
  @AuditAction('BoardMessage', 'REVIEW')
  @ApiOperation({ summary: 'Schválit / zamítnout zprávu' })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewBoardMessageDto,
  ) {
    return this.service.review(user, id, dto)
  }

  @Post(':id/publish')
  @Roles(...ROLES_MANAGE)
  @AuditAction('BoardMessage', 'PUBLISH')
  @ApiOperation({ summary: 'Publikovat zprávu (DRAFT → PUBLISHED)' })
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.publish(user, id)
  }

  @Post(':id/archive')
  @Roles(...ROLES_MANAGE)
  @AuditAction('BoardMessage', 'ARCHIVE')
  @ApiOperation({ summary: 'Archivovat zprávu' })
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.archive(user, id)
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('BoardMessage', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat zprávu (soft delete)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.remove(user, id)
  }

  @Get(':id/read-stats')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Statistiky přečtení zprávy' })
  getReadStats(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getReadStats(user, id)
  }
}
