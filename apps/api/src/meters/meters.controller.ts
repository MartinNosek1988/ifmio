import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MetersService } from './meters.service'
import { CreateMeterDto, UpdateMeterDto } from './dto/meter.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types';

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
  @Roles(...ROLES_OPS)
  @AuditAction('meter', 'create')
  @ApiOperation({ summary: 'Vytvořit měřidlo' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMeterDto) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('meter', 'update')
  @ApiOperation({ summary: 'Upravit měřidlo' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeterDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
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
  @Roles(...ROLES_OPS)
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
  @Roles(...ROLES_OPS)
  @AuditAction('meterReading', 'delete')
  @ApiOperation({ summary: 'Smazat odpočet' })
  deleteReading(
    @CurrentUser() user: AuthUser,
    @Param('meterId') meterId: string,
    @Param('readingId') readingId: string,
  ) {
    return this.service.deleteReading(user, meterId, readingId)
  }

  // ─── INITIAL READINGS ──────────────────────────────────────────

  @Post(':id/initial-reading')
  @Roles(...ROLES_OPS)
  @ApiOperation({ summary: 'Nastavit počáteční odečet měřidla' })
  setInitialReading(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { value: number; readingDate: string; note?: string },
  ) {
    return this.service.setInitialReading(user, id, dto)
  }

  @Post('bulk-initial-readings')
  @Roles(...ROLES_OPS)
  @ApiOperation({ summary: 'Hromadné počáteční odečty' })
  setBulkInitialReadings(
    @CurrentUser() user: AuthUser,
    @Body() dto: { propertyId: string; readings: Array<{ meterId: string; value: number; readingDate: string; note?: string }> },
  ) {
    return this.service.setBulkInitialReadings(user, dto.propertyId, dto.readings)
  }
}
