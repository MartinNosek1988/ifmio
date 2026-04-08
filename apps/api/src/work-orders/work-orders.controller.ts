import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { WorkOrdersService } from './work-orders.service'
import { CreateWorkOrderDto, UpdateWorkOrderDto, ChangeStatusDto, AddCommentDto } from './dto/work-order.dto'
import { DispatchWorkOrderDto, ConfirmWorkOrderDto, DeclineWorkOrderDto, CompleteWorkOrderDto, CsatDto } from './dto/dispatch.dto'
import { ScheduleWorkOrderDto, StartWorkDto, CompleteWorkDto, AddSignatureDto, AddMaterialDto } from './dto/field-service.dto'
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
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkOrderDto) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'update')
  @ApiOperation({ summary: 'Upravit WO' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
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
    @Body() dto: ChangeStatusDto,
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
    @Body() dto: AddCommentDto,
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

  // ─── Field Service ────────────────────────────────────

  @Get('my-schedule')
  @ApiOperation({ summary: 'Denní plán technika' })
  mySchedule(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.service.getMySchedule(user, date)
  }

  @Get('dispatch')
  @Roles(...ROLES_OPS)
  @ApiOperation({ summary: 'Dispečerský přehled na den' })
  dispatch(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.service.getDispatchView(user, date)
  }

  @Post(':id/schedule')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'schedule')
  @ApiOperation({ summary: 'Naplánovat výjezd' })
  schedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ScheduleWorkOrderDto) {
    return this.service.scheduleWork(user, id, dto)
  }

  @Post(':id/start')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'start')
  @ApiOperation({ summary: 'Technik přijel na místo' })
  startWork(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StartWorkDto) {
    return this.service.startWork(user, id, dto)
  }

  @Post(':id/complete')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'complete')
  @ApiOperation({ summary: 'Technik dokončil práci' })
  completeWork(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CompleteWorkDto) {
    return this.service.completeWork(user, id, dto)
  }

  @Post(':id/signature')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'signature')
  @ApiOperation({ summary: 'Přidat podpis zákazníka' })
  addSignature(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddSignatureDto) {
    return this.service.addSignature(user, id, dto)
  }

  @Get(':id/materials')
  @ApiOperation({ summary: 'Seznam materiálu' })
  listMaterials(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listMaterials(user, id)
  }

  @Post(':id/materials')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'addMaterial')
  @ApiOperation({ summary: 'Přidat materiál' })
  addMaterial(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddMaterialDto) {
    return this.service.addMaterial(user, id, dto)
  }

  @Put(':id/materials/:materialId')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'updateMaterial')
  @ApiOperation({ summary: 'Upravit materiál' })
  updateMaterial(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('materialId') materialId: string, @Body() dto: AddMaterialDto) {
    return this.service.updateMaterial(user, id, materialId, dto)
  }

  @Delete(':id/materials/:materialId')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'removeMaterial')
  @ApiOperation({ summary: 'Odebrat materiál' })
  removeMaterial(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('materialId') materialId: string) {
    return this.service.removeMaterial(user, id, materialId)
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

  // ─── DISPATCH WORKFLOW ────────────────────────────────────────

  @Post(':id/dispatch')
  @Roles(...ROLES_OPS)
  @AuditAction('workOrder', 'dispatch')
  @ApiOperation({ summary: 'Odeslat pracovní úkol dodavateli' })
  dispatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DispatchWorkOrderDto) {
    return this.service.dispatchToSupplier(user, id, dto)
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Dodavatel potvrdí pracovní úkol' })
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ConfirmWorkOrderDto) {
    return this.service.confirmBySupplier(user, id, dto)
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Dodavatel odmítne pracovní úkol' })
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DeclineWorkOrderDto) {
    return this.service.declineBySupplier(user, id, dto)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Dodavatel hlásí dokončení pracovního úkolu' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CompleteWorkOrderDto) {
    return this.service.completeBySupplier(user, id, dto)
  }

  @Post(':id/csat')
  @ApiOperation({ summary: 'Hodnocení dokončeného pracovního úkolu (CSAT)' })
  csat(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CsatDto) {
    return this.service.submitCsat(user, id, dto)
  }
}
