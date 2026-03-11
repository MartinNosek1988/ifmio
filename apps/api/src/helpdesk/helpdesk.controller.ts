import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { HelpdeskService } from './helpdesk.service'
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard'
import { Roles }           from '../common/decorators/roles.decorator'
import { CurrentUser }     from '../common/decorators/current-user.decorator'
import { AuditAction }     from '../common/decorators/audit.decorator'
import { ROLES_WRITE }     from '../common/constants/roles.constants'
import { HelpdeskListQueryDto, CreateTicketDto, UpdateTicketDto, CreateItemDto, CreateProtocolDto } from './dto/helpdesk.dto'
import type { AuthUser }   from '@ifmio/shared-types'

@ApiTags('Helpdesk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private service: HelpdeskService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam ticketů' })
  listTickets(@CurrentUser() user: AuthUser, @Query() query: HelpdeskListQueryDto) {
    return this.service.listTickets(user, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail ticketu s položkami' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('HelpdeskTicket', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit ticket' })
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('HelpdeskTicket', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat ticket' })
  updateTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.service.updateTicket(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('HelpdeskTicket', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat ticket' })
  deleteTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteTicket(user, id)
  }

  // Items
  @Post(':ticketId/items')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Přidat položku protokolu' })
  addItem(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.service.addItem(user, ticketId, dto)
  }

  @Delete(':ticketId/items/:itemId')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odstranit položku' })
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removeItem(user, ticketId, itemId)
  }

  // Protocol
  @Post(':ticketId/protocol')
  @Roles(...ROLES_WRITE)
  @AuditAction('HelpdeskProtocol', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit/aktualizovat protokol' })
  createProtocol(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateProtocolDto,
  ) {
    return this.service.createOrUpdateProtocol(user, ticketId, dto)
  }

  @Get(':ticketId/protocol')
  @ApiOperation({ summary: 'Získat protokol ticketu' })
  getProtocol(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
  ) {
    return this.service.getProtocol(user, ticketId)
  }
}
