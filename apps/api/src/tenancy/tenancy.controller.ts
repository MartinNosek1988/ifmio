import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TenancyService } from './tenancy.service'
import { CreateTenancyDto } from './dto/create-tenancy.dto'
import { UpdateTenancyDto } from './dto/update-tenancy.dto'
import { TerminateTenancyDto } from './dto/terminate-tenancy.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Tenancies')
@ApiBearerAuth()
@Controller('tenancies')
export class TenancyController {
  constructor(private service: TenancyService) {}

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Nájmy jednotky' })
  findByUnit(@CurrentUser() user: AuthUser, @Param('unitId') unitId: string) {
    return this.service.findByUnit(user.tenantId, unitId)
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Nájmy dle nemovitosti' })
  findByProperty(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findByProperty(user.tenantId, propertyId, includeInactive === 'true')
  }

  @Get('party/:partyId')
  @ApiOperation({ summary: 'Nájmy subjektu' })
  findByParty(@CurrentUser() user: AuthUser, @Param('partyId') partyId: string) {
    return this.service.findByParty(user.tenantId, partyId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail nájmu' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit nájem' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTenancyDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit nájem' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTenancyDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Post(':id/terminate')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Ukončit nájem' })
  terminate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TerminateTenancyDto) {
    return this.service.terminate(user.tenantId, id, new Date(dto.moveOutDate))
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat nájem' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user.tenantId, id)
  }
}
