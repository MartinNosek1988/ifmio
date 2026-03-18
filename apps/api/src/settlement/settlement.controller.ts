import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SettlementService } from './settlement.service'
import { CreateSettlementDto, AddCostDto } from './dto/create-settlement.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Settlements')
@ApiBearerAuth()
@Controller('settlements')
export class SettlementController {
  constructor(private service: SettlementService) {}

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit vyúčtování' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSettlementDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Get()
  @Roles('tenant_owner', 'tenant_admin', 'finance_manager')
  @ApiOperation({ summary: 'Seznam vyúčtování' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(user.tenantId, { propertyId, status, year })
  }

  @Get(':id')
  @Roles('tenant_owner', 'tenant_admin', 'finance_manager')
  @ApiOperation({ summary: 'Detail vyúčtování' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post(':id/costs')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Přidat nákladovou položku' })
  addCost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddCostDto) {
    return this.service.addCost(user.tenantId, id, dto)
  }

  @Delete('costs/:costId')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odebrat nákladovou položku' })
  removeCost(@CurrentUser() user: AuthUser, @Param('costId') costId: string) {
    return this.service.removeCost(user.tenantId, costId)
  }

  @Post(':id/calculate')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Spustit výpočet vyúčtování' })
  calculate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.calculate(user.tenantId, id)
  }

  @Post(':id/approve')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Schválit vyúčtování' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.approve(user.tenantId, id, user.id)
  }

  @Get(':id/units/:unitId')
  @Roles('tenant_owner', 'tenant_admin', 'finance_manager')
  @ApiOperation({ summary: 'Detail vyúčtování pro jednotku' })
  getUnitDetail(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('unitId') unitId: string) {
    return this.service.getUnitDetail(user.tenantId, id, unitId)
  }
}
