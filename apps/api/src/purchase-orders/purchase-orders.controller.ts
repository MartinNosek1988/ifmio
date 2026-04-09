import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CancelPurchaseOrderDto,
  MatchInvoiceDto,
} from './dto/purchase-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_FINANCE } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private service: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam objednavek' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('matchStatus') matchStatus?: string,
    @Query('supplierId') supplierId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      status, matchStatus, supplierId, propertyId,
      dateFrom, dateTo, search, page, limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky objednavek' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.stats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail objednavky' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Post()
  @Roles(...ROLES_FINANCE)
  @AuditAction('purchaseOrder', 'create')
  @ApiOperation({ summary: 'Vytvorit objednavku' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('purchaseOrder', 'update')
  @ApiOperation({ summary: 'Upravit objednavku' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('purchaseOrder', 'delete')
  @ApiOperation({ summary: 'Smazat objednavku' })
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/submit')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Odeslat ke schvaleni' })
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.submit(user, id);
  }

  @Post(':id/approve')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Schvalit objednavku' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.approve(user, id);
  }

  @Post(':id/send')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Odeslat dodavateli' })
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.send(user, id);
  }

  @Post(':id/cancel')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Zrusit objednavku' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.service.cancel(user, id, dto.reason);
  }

  @Post(':id/match-invoice')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Sparovat fakturu s objednavkou' })
  matchInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MatchInvoiceDto,
  ) {
    return this.service.matchInvoice(user, id, dto.invoiceId);
  }

  @Delete(':id/match-invoice/:invoiceId')
  @Roles(...ROLES_FINANCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Zrusit sparovani faktury' })
  unmatchInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.service.unmatchInvoice(user, id, invoiceId);
  }
}

// ─── Work Order shortcut ───────────────────────────────────────────

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderPurchaseOrderController {
  constructor(private service: PurchaseOrdersService) {}

  @Post(':id/create-purchase-order')
  @Roles(...ROLES_FINANCE)
  @AuditAction('purchaseOrder', 'create')
  @ApiOperation({ summary: 'Vytvorit objednavku z pracovniho prikazu' })
  createFromWorkOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.createFromWorkOrder(user, id, dto);
  }
}

// ─── Helpdesk shortcut ─────────────────────────────────────────────

@ApiTags('Helpdesk')
@ApiBearerAuth()
@Controller('helpdesk')
export class HelpdeskPurchaseOrderController {
  constructor(private service: PurchaseOrdersService) {}

  @Post(':id/create-purchase-order')
  @Roles(...ROLES_FINANCE)
  @AuditAction('purchaseOrder', 'create')
  @ApiOperation({ summary: 'Vytvorit objednavku z helpdesk ticketu' })
  createFromTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.createFromTicket(user, id, dto);
  }
}
