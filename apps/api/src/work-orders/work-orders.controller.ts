import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { WorkOrdersService } from './work-orders.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('WorkOrders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private service: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam work orders' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('propertyId') propertyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, priority, propertyId, search })
  }

  @Get('stats')
  @ApiOperation({ summary: 'WO statistiky' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user)
  }

  @Get('my-agenda')
  @ApiOperation({ summary: 'Dnešní agenda technika' })
  myAgenda(@CurrentUser() user: AuthUser) {
    return this.service.getMyAgenda(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail work order' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'create')
  @ApiOperation({ summary: 'Vytvořit WO' })
  create(@CurrentUser() user: AuthUser, @Body() dto: {
    title: string
    description?: string
    workType?: string
    priority?: string
    propertyId?: string
    unitId?: string
    assetId?: string
    helpdeskTicketId?: string
    assignee?: string
    requester?: string
    assigneeUserId?: string
    requesterUserId?: string
    dispatcherUserId?: string
    deadline?: string
    estimatedHours?: number
    laborCost?: number
    materialCost?: number
    note?: string
  }) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'update')
  @ApiOperation({ summary: 'Upravit WO' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      title?: string
      description?: string
      workType?: string
      priority?: string
      propertyId?: string
      unitId?: string
      assetId?: string
      assignee?: string
      requester?: string
      assigneeUserId?: string
      requesterUserId?: string
      dispatcherUserId?: string
      deadline?: string
      estimatedHours?: number
      actualHours?: number
      laborCost?: number
      materialCost?: number
      note?: string
      workSummary?: string
      findings?: string
      recommendation?: string
      requirePhoto?: boolean
      requireHours?: boolean
      requireSummary?: boolean
      requireProtocol?: boolean
    },
  ) {
    return this.service.update(user, id, dto)
  }

  @Put(':id/status')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'statusChange')
  @ApiOperation({ summary: 'Změna statusu WO' })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    return this.service.changeStatus(user, id, dto.status)
  }

  @Get(':id/completion-status')
  @ApiOperation({ summary: 'Stav splnění požadavků pro dokončení' })
  completionStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getCompletionStatus(user, id)
  }

  @Post(':id/comments')
  @AuditAction('workOrder', 'comment')
  @ApiOperation({ summary: 'Přidat komentář' })
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { text: string },
  ) {
    return this.service.addComment(user, id, dto.text)
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'delete')
  @ApiOperation({ summary: 'Smazat WO' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }
}

// ─── Helpdesk → Work Order controller ──────────────────────────

@ApiTags('Helpdesk')
@ApiBearerAuth()
@Controller('helpdesk')
export class HelpdeskWorkOrderController {
  constructor(private service: WorkOrdersService) {}

  @Post(':ticketId/work-orders')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'create')
  @ApiOperation({ summary: 'Vytvořit úkol z požadavku' })
  createFromTicket(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: {
      title?: string
      description?: string
      priority?: string
      assigneeUserId?: string
      dispatcherUserId?: string
      deadline?: string
      note?: string
    },
  ) {
    return this.service.createFromTicket(user, ticketId, dto)
  }

  @Get(':ticketId/work-orders')
  @ApiOperation({ summary: 'Úkoly navázané na požadavek' })
  listForTicket(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
  ) {
    return this.service.listForTicket(user, ticketId)
  }
}
