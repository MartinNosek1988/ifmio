import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { DebtorsService } from './debtors.service'
import { KontoService } from '../konto/konto.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Debtors')
@ApiBearerAuth()
@Controller('debtors')
export class DebtorsController {
  constructor(
    private service: DebtorsService,
    private konto: KontoService,
  ) {}

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Dlužníci nemovitosti' })
  getPropertyDebtors(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('minAmount') minAmount?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.service.getPropertyDebtors(user.tenantId, propertyId, {
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      sortBy: (sortBy as any) ?? 'amount',
    })
  }

  @Get('property/:propertyId/stats')
  @ApiOperation({ summary: 'Statistiky dlužníků' })
  getDebtorStats(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.service.getDebtorStats(user.tenantId, propertyId)
  }

  @Get('account/:accountId/aging')
  @ApiOperation({ summary: 'Aging analýza konta' })
  async getAccountAging(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    await this.konto.verifyAccountTenant(user.tenantId, accountId)
    return this.service.calculateAccountAging(accountId)
  }
}
