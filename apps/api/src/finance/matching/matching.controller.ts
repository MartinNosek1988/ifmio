import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MatchingService } from './matching.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditAction } from '../../common/decorators/audit.decorator'
import { ROLES_FINANCE } from '../../common/constants/roles.constants'
import { ManualMatchDto, AutoMatchDto, MatchAllDto } from './matching.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Finance — Matching')
@ApiBearerAuth()
@Controller('finance/matching')
export class MatchingController {
  constructor(private matching: MatchingService) {}

  @Post('auto')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'AUTO_MATCH')
  @ApiOperation({ summary: 'Auto-párování transakcí s předpisy a doklady' })
  autoMatch(
    @CurrentUser() user: AuthUser,
    @Body() dto: AutoMatchDto,
  ) {
    return this.matching.autoMatchTransactions(user, dto.propertyId, dto.bankAccountId)
  }

  @Post('match-all')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'MATCH_ALL')
  @ApiOperation({ summary: 'Spárovat vše — auto-match + klasifikace poplatků' })
  matchAll(
    @CurrentUser() user: AuthUser,
    @Body() dto: MatchAllDto,
  ) {
    return this.matching.matchAllUnprocessed(user, dto.propertyId)
  }

  @Post(':id/match')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'MANUAL_MATCH')
  @ApiOperation({ summary: 'Manuální párování transakce s cílem' })
  manualMatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ManualMatchDto,
  ) {
    return this.matching.manualMatch(user, id, dto)
  }

  @Patch(':id/unmatch')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'UNMATCH')
  @ApiOperation({ summary: 'Odpárovat transakci' })
  unmatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.matching.unmatchTransaction(user, id)
  }

  @Get('unmatched')
  @ApiOperation({ summary: 'Seznam nespárovaných transakcí' })
  unmatched(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('bankAccountId') bankAccountId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matching.getUnmatchedTransactions(
      user, propertyId, bankAccountId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    )
  }

  @Get(':id/suggestions')
  @ApiOperation({ summary: 'Návrhy párování pro transakci' })
  suggestions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.matching.getMatchSuggestions(user, id)
  }
}
