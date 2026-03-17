import { Controller, Post, Get, Param, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { BankingService } from './banking.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Banking')
@ApiBearerAuth()
@Controller('banking')
export class BankingController {
  constructor(private service: BankingService) {}

  @Post(':bankAccountId/configure')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Nastavit API sync pro bankovní účet' })
  configure(
    @CurrentUser() user: AuthUser,
    @Param('bankAccountId') bankAccountId: string,
    @Body() dto: { provider: string; apiToken: string; syncIntervalMin?: number },
  ) {
    return this.service.configureApiSync(user.tenantId, bankAccountId, dto)
  }

  @Post(':bankAccountId/sync')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Manuální synchronizace transakcí' })
  sync(@CurrentUser() user: AuthUser, @Param('bankAccountId') bankAccountId: string) {
    return this.service.triggerSync(user.tenantId, bankAccountId)
  }

  @Post(':bankAccountId/disable')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vypnout automatický sync' })
  disable(@CurrentUser() user: AuthUser, @Param('bankAccountId') bankAccountId: string) {
    return this.service.disableSync(user.tenantId, bankAccountId)
  }

  @Get(':bankAccountId/status')
  @ApiOperation({ summary: 'Stav synchronizace bankovního účtu' })
  status(@CurrentUser() user: AuthUser, @Param('bankAccountId') bankAccountId: string) {
    return this.service.getSyncStatus(user.tenantId, bankAccountId)
  }
}
