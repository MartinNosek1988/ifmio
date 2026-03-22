import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { InitialBalancesService } from './initial-balances.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import {
  SetOwnerBalanceDto,
  BulkSetOwnerBalancesDto,
  SetBankBalanceDto,
  SetFundBalanceDto,
  SetDepositDto,
  SetMeterReadingDto,
} from './dto/initial-balance.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Initial Balances')
@ApiBearerAuth()
@Controller('initial-balances')
export class InitialBalancesController {
  constructor(private service: InitialBalancesService) {}

  @Get()
  @ApiOperation({ summary: 'Počáteční stavy pro nemovitost' })
  getPropertyInitialBalances(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId: string,
  ) {
    return this.service.getPropertyInitialBalances(user.tenantId, propertyId)
  }

  @Post('owner')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'SET_OWNER')
  @ApiOperation({ summary: 'Nastavit počáteční stav vlastníka' })
  setOwnerBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetOwnerBalanceDto,
  ) {
    return this.service.setOwnerBalance(user.tenantId, user.id, dto)
  }

  @Post('owner/bulk')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'BULK_SET_OWNER')
  @ApiOperation({ summary: 'Hromadné nastavení počátečních stavů vlastníků' })
  bulkSetOwnerBalances(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkSetOwnerBalancesDto,
  ) {
    return this.service.bulkSetOwnerBalances(user.tenantId, user.id, dto)
  }

  @Post('bank')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'SET_BANK')
  @ApiOperation({ summary: 'Nastavit počáteční zůstatek bankovního účtu' })
  setBankAccountBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetBankBalanceDto,
  ) {
    return this.service.setBankAccountBalance(user.tenantId, user.id, dto)
  }

  @Post('fund')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'SET_FUND')
  @ApiOperation({ summary: 'Nastavit zůstatek fondu' })
  setFundBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetFundBalanceDto,
  ) {
    return this.service.setFundBalance(user.tenantId, user.id, dto)
  }

  @Post('deposit')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'SET_DEPOSIT')
  @ApiOperation({ summary: 'Nastavit kauci' })
  setDeposit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetDepositDto,
  ) {
    return this.service.setDeposit(user.tenantId, user.id, dto)
  }

  @Post('meter')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'SET_METER')
  @ApiOperation({ summary: 'Nastavit počáteční stav měřidla' })
  setMeterReading(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetMeterReadingDto,
  ) {
    return this.service.setMeterReading(user.tenantId, user.id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('InitialBalance', 'DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Smazat počáteční stav (s reverzí konta)' })
  deleteInitialBalance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteInitialBalance(user.tenantId, id)
  }
}
