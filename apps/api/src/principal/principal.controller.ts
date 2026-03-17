import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PrincipalService } from './principal.service'
import { CreatePrincipalDto } from './dto/create-principal.dto'
import { UpdatePrincipalDto } from './dto/update-principal.dto'
import { PrincipalQueryDto } from './dto/principal-query.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Principals')
@ApiBearerAuth()
@Controller('principals')
export class PrincipalController {
  constructor(private service: PrincipalService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam principálů' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PrincipalQueryDto) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail principála' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit principála' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePrincipalDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit principála' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePrincipalDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat principála' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user.tenantId, id)
  }

  // Sub-resources
  @Get(':id/properties')
  @ApiOperation({ summary: 'Nemovitosti principála' })
  getProperties(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getProperties(user.tenantId, id)
  }

  @Get(':id/units')
  @ApiOperation({ summary: 'Jednotky principála' })
  getUnits(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getUnits(user.tenantId, id)
  }

  @Get(':id/tenants')
  @ApiOperation({ summary: 'Nájemníci principála' })
  getTenants(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getTenants(user.tenantId, id)
  }
}
