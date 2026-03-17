import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FinancialContextService } from './financial-context.service'
import { CreateFinancialContextDto } from './dto/create-financial-context.dto'
import { UpdateFinancialContextDto } from './dto/update-financial-context.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Financial Contexts')
@ApiBearerAuth()
@Controller('financial-contexts')
export class FinancialContextController {
  constructor(private service: FinancialContextService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam finančních kontextů' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('principalId') principalId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('scopeType') scopeType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(user.tenantId, {
      principalId,
      propertyId,
      scopeType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    })
  }

  @Get('by-property/:propertyId')
  @ApiOperation({ summary: 'Finanční kontexty pro nemovitost' })
  getByProperty(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getByProperty(user.tenantId, propertyId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail finančního kontextu' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit finanční kontext' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFinancialContextDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit finanční kontext' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFinancialContextDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat finanční kontext' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user.tenantId, id)
  }
}
