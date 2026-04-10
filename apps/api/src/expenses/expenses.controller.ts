import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExtractExpenseDto,
  RejectExpenseDto,
  ReimburseExpenseDto,
} from './dto/expense.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_FINANCE, ROLES_OPS } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';

const ROLES_OPS_FINANCE = [...new Set([...ROLES_OPS, ...ROLES_FINANCE])];

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  @Roles(...ROLES_OPS_FINANCE)
  @ApiOperation({ summary: 'Seznam vydaju' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('propertyId') propertyId?: string,
    @Query('workOrderId') workOrderId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      status, category, propertyId, workOrderId,
      dateFrom, dateTo, search, page, limit,
    });
  }

  @Get('stats')
  @Roles(...ROLES_OPS_FINANCE)
  @ApiOperation({ summary: 'Statistiky vydaju' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.stats(user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Moje vydaje' })
  getMyExpenses(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMyExpenses(user, { status, page, limit });
  }

  @Get(':id')
  @Roles(...ROLES_OPS_FINANCE)
  @ApiOperation({ summary: 'Detail vydaje' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Post()
  @Roles(...ROLES_OPS)
  @AuditAction('expense', 'create')
  @ApiOperation({ summary: 'Vytvorit vydaj' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('expense', 'update')
  @ApiOperation({ summary: 'Upravit vydaj' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('expense', 'delete')
  @ApiOperation({ summary: 'Smazat vydaj' })
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post('extract')
  @Roles(...ROLES_OPS)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'AI extrakce dat z dokladu' })
  extract(@Body() dto: ExtractExpenseDto) {
    return this.service.extract(dto);
  }

  @Post(':id/submit')
  @Roles(...ROLES_OPS)
  @ApiOperation({ summary: 'Odeslat ke schvaleni' })
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.submit(user, id);
  }

  @Post(':id/approve')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Schvalit vydaj' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.approve(user, id);
  }

  @Post(':id/reject')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Zamitnout vydaj' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
  ) {
    return this.service.reject(user, id, dto.reason);
  }

  @Post(':id/reimburse')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Proplatit vydaj' })
  reimburse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReimburseExpenseDto,
  ) {
    return this.service.reimburse(user, id, dto.reimbursedAmount, dto.reimbursementType);
  }
}
