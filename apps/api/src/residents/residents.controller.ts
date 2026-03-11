import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResidentsService } from './residents.service';
import { InvoicesService } from '../finance/invoices.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_WRITE, ROLES_MANAGE } from '../common/constants/roles.constants';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor(
    private service: ResidentsService,
    private invoicesService: InvoicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Seznam obyvatel (tenant-scoped, pagination)' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryResidentDto) {
    return this.service.findAll(user, query);
  }

  @Get('debtors')
  @ApiOperation({ summary: 'Seznam dlužníků' })
  findDebtors(@CurrentUser() user: AuthUser) {
    return this.service.findDebtors(user);
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Faktury kontaktu' })
  findInvoices(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.findForResident(user, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail obyvatele s historií pobytů' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('resident', 'create')
  @ApiOperation({ summary: 'Přidat obyvatele' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResidentDto) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('resident', 'update')
  @ApiOperation({ summary: 'Aktualizovat obyvatele' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('resident', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat obyvatele (soft delete)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user, id);
  }

  @Post('bulk/deactivate')
  @Roles(...ROLES_MANAGE)
  @AuditAction('resident', 'bulk_deactivate')
  @ApiOperation({ summary: 'Hromadná deaktivace' })
  bulkDeactivate(@CurrentUser() user: AuthUser, @Body('ids') ids: string[]) {
    return this.service.bulkDeactivate(user, ids);
  }

  @Post('bulk/activate')
  @Roles(...ROLES_MANAGE)
  @AuditAction('resident', 'bulk_activate')
  @ApiOperation({ summary: 'Hromadná aktivace' })
  bulkActivate(@CurrentUser() user: AuthUser, @Body('ids') ids: string[]) {
    return this.service.bulkActivate(user, ids);
  }

  @Post('bulk/assign-property')
  @Roles(...ROLES_WRITE)
  @AuditAction('resident', 'bulk_assign_property')
  @ApiOperation({ summary: 'Hromadné přiřazení nemovitosti' })
  bulkAssignProperty(
    @CurrentUser() user: AuthUser,
    @Body() body: { ids: string[]; propertyId: string },
  ) {
    return this.service.bulkAssignProperty(user, body.ids, body.propertyId);
  }

  @Post('bulk/mark-debtors')
  @Roles(...ROLES_MANAGE)
  @AuditAction('resident', 'bulk_mark_debtors')
  @ApiOperation({ summary: 'Hromadné označení dlužníků' })
  bulkMarkDebtors(
    @CurrentUser() user: AuthUser,
    @Body() body: { ids: string[]; hasDebt: boolean },
  ) {
    return this.service.bulkMarkAsDebtors(user, body.ids, body.hasDebt);
  }
}
