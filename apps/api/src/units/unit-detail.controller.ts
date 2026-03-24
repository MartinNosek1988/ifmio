import {
  Controller, Get, Post, Put, Delete,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UnitDetailService } from './unit-detail.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_WRITE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Unit Detail')
@ApiBearerAuth()
@Controller('properties/:propertyId/units/:unitId')
export class UnitDetailController {
  constructor(private service: UnitDetailService) {}

  // ─── Navigation ────────────────────────────────────────────

  @Get('nav')
  @ApiOperation({ summary: 'Unit navigation (prev/next/total)' })
  getNav(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.service.getUnitNav(user, propertyId, unitId)
  }

  // ─── Rooms ─────────────────────────────────────────────────

  @Get('rooms')
  @ApiOperation({ summary: 'List unit rooms (Plochy)' })
  listRooms(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string) {
    return this.service.listRooms(user, pid, uid)
  }

  @Post('rooms')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Add room' })
  createRoom(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Body() dto: { name: string; area: number; coefficient?: number }) {
    return this.service.createRoom(user, pid, uid, dto)
  }

  @Put('rooms/:roomId')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Update room' })
  updateRoom(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('roomId') roomId: string, @Body() dto: { name?: string; area?: number; coefficient?: number }) {
    return this.service.updateRoom(user, pid, uid, roomId, dto)
  }

  @Delete('rooms/:roomId')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room' })
  async deleteRoom(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('roomId') roomId: string) {
    await this.service.deleteRoom(user, pid, uid, roomId)
  }

  // ─── Quantities ────────────────────────────────────────────

  @Get('quantities')
  @ApiOperation({ summary: 'List unit quantities (Veličiny)' })
  listQuantities(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string) {
    return this.service.listQuantities(user, pid, uid)
  }

  @Post('quantities')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Upsert quantity' })
  upsertQuantity(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Body() dto: { name: string; value: number; unitLabel?: string }) {
    return this.service.upsertQuantity(user, pid, uid, dto)
  }

  @Delete('quantities/:quantityId')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quantity' })
  async deleteQuantity(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('quantityId') qid: string) {
    await this.service.deleteQuantity(user, pid, uid, qid)
  }

  // ─── Equipment ─────────────────────────────────────────────

  @Get('equipment')
  @ApiOperation({ summary: 'List unit equipment (Vybavení)' })
  listEquipment(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string) {
    return this.service.listEquipment(user, pid, uid)
  }

  @Post('equipment')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Add equipment' })
  createEquipment(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Body() dto: { name: string; status?: string; note?: string }) {
    return this.service.createEquipment(user, pid, uid, dto)
  }

  @Put('equipment/:eqId')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Update equipment' })
  updateEquipment(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('eqId') eqId: string, @Body() dto: { name?: string; status?: string; note?: string }) {
    return this.service.updateEquipment(user, pid, uid, eqId, dto)
  }

  @Delete('equipment/:eqId')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete equipment' })
  async deleteEquipment(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('eqId') eqId: string) {
    await this.service.deleteEquipment(user, pid, uid, eqId)
  }

  // ─── Management Fees ───────────────────────────────────────

  @Get('management-fees')
  @ApiOperation({ summary: 'List management fees (Správní odměna)' })
  listFees(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string) {
    return this.service.listFees(user, pid, uid)
  }

  @Post('management-fees')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Add management fee' })
  createFee(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Body() dto: { amount: number; calculationType?: string; validFrom: string; validTo?: string }) {
    return this.service.createFee(user, pid, uid, dto)
  }

  @Put('management-fees/:feeId')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Update management fee' })
  updateFee(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('feeId') feeId: string, @Body() dto: { amount?: number; calculationType?: string; validFrom?: string; validTo?: string | null }) {
    return this.service.updateFee(user, pid, uid, feeId, dto)
  }

  @Delete('management-fees/:feeId')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete management fee' })
  async deleteFee(@CurrentUser() user: AuthUser, @Param('propertyId') pid: string, @Param('unitId') uid: string, @Param('feeId') feeId: string) {
    await this.service.deleteFee(user, pid, uid, feeId)
  }
}
