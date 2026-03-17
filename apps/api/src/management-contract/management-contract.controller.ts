import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ManagementContractService } from './management-contract.service'
import { CreateManagementContractDto } from './dto/create-management-contract.dto'
import { UpdateManagementContractDto } from './dto/update-management-contract.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Management Contracts')
@ApiBearerAuth()
@Controller('management-contracts')
export class ManagementContractController {
  constructor(private service: ManagementContractService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam smluv o správě' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('principalId') principalId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(user.tenantId, {
      principalId,
      propertyId,
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    })
  }

  @Get('by-property/:propertyId')
  @ApiOperation({ summary: 'Smlouvy pro nemovitost' })
  getByProperty(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getByProperty(user.tenantId, propertyId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail smlouvy o správě' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit smlouvu o správě' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateManagementContractDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit smlouvu o správě' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateManagementContractDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat smlouvu o správě' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user.tenantId, id)
  }
}
