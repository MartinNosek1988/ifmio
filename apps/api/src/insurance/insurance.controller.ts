import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { InsuranceService } from './insurance.service'
import { CreateInsuranceDto, UpdateInsuranceDto, CreateInsuranceClaimDto, UpdateInsuranceClaimDto } from './insurance.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Insurance')
@ApiBearerAuth()
@Controller()
export class InsuranceController {
  constructor(private service: InsuranceService) {}

  // ── Insurance CRUD ──────────────────────────────────

  @Get('properties/:propertyId/insurances')
  @ApiOperation({ summary: 'Seznam pojistek nemovitosti' })
  findAll(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.findAll(user, propertyId)
  }

  @Get('properties/:propertyId/insurances/:id')
  @ApiOperation({ summary: 'Detail pojistky' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id)
  }

  @Post('properties/:propertyId/insurances')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vytvořit pojistku' })
  create(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string, @Body() dto: CreateInsuranceDto) {
    return this.service.create(user, propertyId, dto)
  }

  @Put('properties/:propertyId/insurances/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit pojistku' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.service.update(user, id, dto)
  }

  @Delete('properties/:propertyId/insurances/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat pojistku' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  // ── Claims CRUD ─────────────────────────────────────

  @Get('insurances/:insuranceId/claims')
  @ApiOperation({ summary: 'Seznam pojistných událostí' })
  findClaims(@CurrentUser() user: AuthUser, @Param('insuranceId') insuranceId: string) {
    return this.service.findClaims(user, insuranceId)
  }

  @Post('insurances/:insuranceId/claims')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Nahlásit pojistnou událost' })
  createClaim(@CurrentUser() user: AuthUser, @Param('insuranceId') insuranceId: string, @Body() dto: CreateInsuranceClaimDto) {
    return this.service.createClaim(user, insuranceId, dto)
  }

  @Put('insurances/:insuranceId/claims/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit pojistnou událost' })
  updateClaim(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateInsuranceClaimDto) {
    return this.service.updateClaim(user, id, dto)
  }

  @Delete('insurances/:insuranceId/claims/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat pojistnou událost' })
  removeClaim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeClaim(user, id)
  }

  // ── Dashboard ───────────────────────────────────────

  @Get('insurances/expiring-count')
  @ApiOperation({ summary: 'Počet expirujících pojistek (60 dní)' })
  getExpiringCount(@CurrentUser() user: AuthUser) {
    return this.service.getExpiringCount(user)
  }
}
