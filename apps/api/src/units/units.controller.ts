import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_WRITE, ROLES_MANAGE } from '../common/constants/roles.constants';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Units')
@ApiBearerAuth()
@Controller('properties/:propertyId/units')
export class UnitsController {
  constructor(private service: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Jednotky nemovitosti' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.service.findAll(user, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail jednotky s historií obsazenosti' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(user, propertyId, id);
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('unit', 'create')
  @ApiOperation({ summary: 'Přidat jednotku' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.service.create(user, propertyId, dto);
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('unit', 'update')
  @ApiOperation({ summary: 'Aktualizovat jednotku' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.service.update(user, propertyId, id, dto);
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('unit', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat jednotku' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
  ) {
    await this.service.remove(user, propertyId, id);
  }

  @Post(':unitId/occupancies')
  @Roles(...ROLES_WRITE)
  @AuditAction('occupancy', 'create')
  @ApiOperation({ summary: 'Přidat obyvatele do jednotky' })
  addOccupancy(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('unitId') unitId: string,
    @Body() dto: CreateOccupancyDto,
  ) {
    return this.service.addOccupancy(user, propertyId, unitId, dto);
  }

  @Patch(':unitId/occupancies/:occupancyId/end')
  @Roles(...ROLES_WRITE)
  @AuditAction('occupancy', 'end')
  @ApiOperation({ summary: 'Ukončit pobyt obyvatele' })
  endOccupancy(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('unitId') unitId: string,
    @Param('occupancyId') occupancyId: string,
  ) {
    return this.service.endOccupancy(user, propertyId, unitId, occupancyId);
  }
}
