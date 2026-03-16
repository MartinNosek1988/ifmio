import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_MANAGE, ROLES_FINANCE } from '../common/constants/roles.constants'
import { KontoService } from './konto.service'
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Konto')
@ApiBearerAuth()
@Controller('konto')
export class KontoController {
  constructor(private service: KontoService) {}

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Všechna konta nemovitosti' })
  getPropertyAccounts(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getPropertyAccounts(user.tenantId, propertyId)
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Detail konta' })
  getAccountDetail(@CurrentUser() user: AuthUser, @Param('accountId') accountId: string) {
    return this.service.getAccountDetail(user.tenantId, accountId)
  }

  @Get('account/:accountId/entries')
  @ApiOperation({ summary: 'Historie konta (stránkování)' })
  getAccountLedger(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getAccountLedger(
      user.tenantId,
      accountId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  @Get('resident/:residentId/unit/:unitId')
  @ApiOperation({ summary: 'Konto podle rezidenta a jednotky' })
  getAccountByResident(
    @CurrentUser() user: AuthUser,
    @Param('residentId') residentId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.service.getAccountByResident(user.tenantId, unitId, residentId)
  }

  @Post('account/:accountId/adjust')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Ruční úprava konta' })
  async manualAdjustment(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
    @Body() dto: ManualAdjustmentDto,
  ) {
    await this.service.verifyAccountTenant(user.tenantId, accountId)
    const date = dto.date ? new Date(dto.date) : new Date()
    if (dto.type === 'DEBIT') {
      return this.service.postDebit(accountId, dto.amount, 'MANUAL_ADJUSTMENT', accountId, dto.description, date)
    }
    return this.service.postCredit(accountId, dto.amount, 'MANUAL_ADJUSTMENT', accountId, dto.description, date)
  }

  @Post('recalculate/:accountId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přepočítat zůstatek konta' })
  recalculate(@CurrentUser() user: AuthUser, @Param('accountId') accountId: string) {
    return this.service.recalculateBalance(user.tenantId, accountId)
  }

  @Post('offset')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Zápočet přeplatku mezi konty' })
  applyOffset(
    @CurrentUser() user: AuthUser,
    @Body() dto: { sourceAccountId: string; targetAccountId: string; amount: number; description?: string },
  ) {
    return this.service.applyOverpaymentOffset(user.tenantId, dto.sourceAccountId, dto.targetAccountId, dto.amount, dto.description)
  }
}
