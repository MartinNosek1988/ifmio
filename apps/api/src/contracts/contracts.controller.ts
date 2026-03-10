import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ContractsService } from './contracts.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_WRITE } from '../common/constants/roles.constants'

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private service: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam nájemních smluv' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, propertyId, search })
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky smluv' })
  stats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail smlouvy' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @AuditAction('leaseAgreement', 'create')
  @ApiOperation({ summary: 'Vytvořit smlouvu' })
  create(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string
    unitId?: string
    residentId?: string
    contractType?: string
    monthlyRent: number
    deposit?: number
    startDate: string
    endDate?: string
    indefinite?: boolean
    noticePeriod?: number
    renewalType?: string
    note?: string
  }) {
    return this.service.create(user, dto)
  }

  @Put(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('leaseAgreement', 'update')
  @ApiOperation({ summary: 'Upravit smlouvu' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      propertyId?: string
      unitId?: string
      residentId?: string
      contractType?: string
      monthlyRent?: number
      deposit?: number
      startDate?: string
      endDate?: string
      indefinite?: boolean
      noticePeriod?: number
      renewalType?: string
      note?: string
      status?: string
    },
  ) {
    return this.service.update(user, id, dto)
  }

  @Put(':id/terminate')
  @Roles(...ROLES_WRITE)
  @AuditAction('leaseAgreement', 'terminate')
  @ApiOperation({ summary: 'Ukončit smlouvu' })
  terminate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { terminatedAt?: string; terminationNote?: string },
  ) {
    return this.service.terminate(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_WRITE)
  @AuditAction('leaseAgreement', 'delete')
  @ApiOperation({ summary: 'Smazat smlouvu' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }
}
