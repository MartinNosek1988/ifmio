import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { OwnershipService } from './ownership.service'
import { CreatePropertyOwnershipDto } from './dto/create-property-ownership.dto'
import { UpdatePropertyOwnershipDto } from './dto/update-property-ownership.dto'
import { CreateUnitOwnershipDto } from './dto/create-unit-ownership.dto'
import { UpdateUnitOwnershipDto } from './dto/update-unit-ownership.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Ownerships')
@ApiBearerAuth()
@Controller('ownerships')
export class OwnershipController {
  constructor(private service: OwnershipService) {}

  // ─── Property Ownership ─────────────────────────────────────────

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Vlastníci nemovitosti' })
  getPropertyOwnerships(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getPropertyOwnerships(user.tenantId, propertyId)
  }

  @Post('property')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Přidat vlastníka nemovitosti' })
  createPropertyOwnership(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyOwnershipDto) {
    return this.service.createPropertyOwnership(user.tenantId, dto)
  }

  @Patch('property/:id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit vlastnictví nemovitosti' })
  updatePropertyOwnership(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePropertyOwnershipDto) {
    return this.service.updatePropertyOwnership(user.tenantId, id, dto)
  }

  @Delete('property/:id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Zrušit vlastnictví nemovitosti' })
  async removePropertyOwnership(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.removePropertyOwnership(user.tenantId, id)
  }

  // ─── Unit Ownership ─────────────────────────────────────────────

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Vlastníci jednotky' })
  getUnitOwnerships(@CurrentUser() user: AuthUser, @Param('unitId') unitId: string) {
    return this.service.getUnitOwnerships(user.tenantId, unitId)
  }

  @Get('units-by-property/:propertyId')
  @ApiOperation({ summary: 'Vlastníci jednotek dle nemovitosti' })
  getUnitOwnershipsByProperty(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getUnitOwnershipsByProperty(user.tenantId, propertyId)
  }

  @Post('unit')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Přidat vlastníka jednotky' })
  createUnitOwnership(@CurrentUser() user: AuthUser, @Body() dto: CreateUnitOwnershipDto) {
    return this.service.createUnitOwnership(user.tenantId, dto)
  }

  @Patch('unit/:id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit vlastnictví jednotky' })
  updateUnitOwnership(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUnitOwnershipDto) {
    return this.service.updateUnitOwnership(user.tenantId, id, dto)
  }

  @Delete('unit/:id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Zrušit vlastnictví jednotky' })
  async removeUnitOwnership(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.removeUnitOwnership(user.tenantId, id)
  }
}
