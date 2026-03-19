import { Controller, Get, Post, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SecurityDashboardService } from './security-dashboard.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Security Dashboard')
@ApiBearerAuth()
@Controller('admin/security')
@Roles(...ROLES_MANAGE)
export class SecurityDashboardController {
  constructor(private service: SecurityDashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Security overview — failed logins, MFA adoption, alerts' })
  getOverview(@CurrentUser() user: AuthUser) {
    return this.service.getOverview(user)
  }

  @Get('failed-logins')
  @ApiOperation({ summary: 'Paginated list of failed login attempts' })
  getFailedLogins(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getFailedLogins(user, parseInt(page ?? '1'), parseInt(limit ?? '20'))
  }

  @Get('active-sessions')
  @ApiOperation({ summary: 'All active refresh token sessions' })
  getActiveSessions(@CurrentUser() user: AuthUser) {
    return this.service.getActiveSessions(user)
  }

  @Post('revoke-user-sessions/:userId')
  @ApiOperation({ summary: 'Revoke all sessions for a specific user' })
  revokeUserSessions(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.service.revokeUserSessions(user, userId)
  }
}
