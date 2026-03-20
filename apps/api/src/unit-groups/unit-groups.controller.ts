import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_WRITE } from '../common/constants/roles.constants'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UnitGroupsService } from './unit-groups.service'
import { CreateUnitGroupDto, UpdateUnitGroupDto, AddUnitsDto } from './dto/unit-group.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Unit Groups')
@ApiBearerAuth()
@Controller('properties/:propertyId/unit-groups')
export class UnitGroupsController {
  constructor(private service: UnitGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam skupin jednotek' })
  findAll(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.findAll(user, propertyId)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Vytvořit skupinu jednotek' })
  create(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string, @Body() dto: CreateUnitGroupDto) {
    return this.service.create(user, propertyId, dto)
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Upravit skupinu jednotek' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitGroupDto,
  ) {
    return this.service.update(user, propertyId, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Smazat skupinu jednotek' })
  remove(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string, @Param('id') id: string) {
    return this.service.remove(user, propertyId, id)
  }

  @Post(':id/units')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Přidat jednotky do skupiny' })
  addUnits(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Body() dto: AddUnitsDto,
  ) {
    return this.service.addUnits(user, propertyId, id, dto.unitIds)
  }

  @Delete(':id/units/:unitId')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Odebrat jednotku ze skupiny' })
  removeUnit(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Param('unitId') unitId: string,
  ) {
    return this.service.removeUnit(user, propertyId, id, unitId)
  }

  @Post('auto-entrance')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Auto-vytvořit skupiny dle vchodů (č.p.)' })
  autoCreate(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.autoCreateByEntrance(user, propertyId)
  }
}
