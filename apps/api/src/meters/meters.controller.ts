import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MetersService } from './meters.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_WRITE } from '../common/constants/roles.constants'

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Meters')
@ApiBearerAuth()
@Controller('meters')
export class MetersController {
  constructor(private service: MetersService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam měřidel' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('meterType') meterType?: string,
    @Query('propertyId') propertyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { meterType, propertyId, search })
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky měřidel' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail měřidla' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('meter', 'create')
  @ApiOperation({ summary: 'Vytvořit měřidlo' })
  create(@CurrentUser() user: AuthUser, @Body() dto: {
    name: string
    serialNumber: string
    meterType?: string
    unit?: string
    propertyId?: string
    unitId?: string
    installDate?: string
    calibrationDue?: string
    manufacturer?: string
    location?: string
    note?: string
  }) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('meter', 'update')
  @ApiOperation({ summary: 'Upravit měřidlo' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      name?: string
      serialNumber?: string
      meterType?: string
      unit?: string
      propertyId?: string
      unitId?: string
      installDate?: string
      calibrationDue?: string
      manufacturer?: string
      location?: string
      isActive?: boolean
      note?: string
    },
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('meter', 'delete')
  @ApiOperation({ summary: 'Smazat měřidlo' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  // ── Readings ──

  @Get(':id/readings')
  @ApiOperation({ summary: 'Odpočty měřidla' })
  readings(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getReadings(user, id)
  }

  @Post(':id/readings')
  @Roles(...ROLES_WRITE)
  @AuditAction('meterReading', 'create')
  @ApiOperation({ summary: 'Přidat odpočet' })
  addReading(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { readingDate: string; value: number; note?: string },
  ) {
    return this.service.addReading(user, id, dto)
  }

  @Delete(':meterId/readings/:readingId')
  @Roles(...ROLES_WRITE)
  @AuditAction('meterReading', 'delete')
  @ApiOperation({ summary: 'Smazat odpočet' })
  deleteReading(
    @CurrentUser() user: AuthUser,
    @Param('meterId') meterId: string,
    @Param('readingId') readingId: string,
  ) {
    return this.service.deleteReading(user, meterId, readingId)
  }
}
