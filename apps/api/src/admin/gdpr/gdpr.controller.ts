import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../../common/constants/roles.constants'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditAction } from '../../common/decorators/audit.decorator'
import { GdprService } from './gdpr.service'
import { SecurityAlertingService } from '../../common/security/security-alerting.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('admin/gdpr')
@Roles(...ROLES_MANAGE)
export class GdprController {
  constructor(
    private gdpr: GdprService,
    private alerting: SecurityAlertingService,
  ) {}

  @Post('erase')
  @AuditAction('GDPR', 'ERASE')
  @ApiOperation({ summary: 'GDPR right to erasure — anonymize subject data' })
  async erase(
    @CurrentUser() user: AuthUser,
    @Body() dto: { type: 'party' | 'resident'; subjectId: string; reason: string },
  ) {
    const report = await this.gdpr.eraseSubjectData(user.tenantId, {
      type: dto.type,
      subjectId: dto.subjectId,
      requestedBy: user.id,
      reason: dto.reason || 'Žádost subjektu dle čl. 17 GDPR',
    })

    this.alerting.alert({
      tenantId: user.tenantId,
      type: 'GDPR_ERASURE',
      severity: 'medium',
      details: {
        subjectType: dto.type,
        subjectId: dto.subjectId,
        erasedFields: report.erasedFields.length,
        performedBy: user.email ?? user.id,
      },
      timestamp: new Date(),
    }).catch(() => {})

    return report
  }

  @Get('export/:type/:subjectId')
  @ApiOperation({ summary: 'GDPR data portability — export subject data as JSON' })
  export(
    @CurrentUser() user: AuthUser,
    @Param('type') type: 'party' | 'resident',
    @Param('subjectId') subjectId: string,
  ) {
    return this.gdpr.exportSubjectData(user.tenantId, subjectId, type)
  }

  @Get('erasure-log')
  @ApiOperation({ summary: 'GDPR erasure audit log' })
  erasureLog(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gdpr.getErasureLog(user.tenantId, parseInt(page ?? '1'), parseInt(limit ?? '20'))
  }
}
