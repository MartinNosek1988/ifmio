import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard'
import { CurrentUser }      from '../common/decorators/current-user.decorator'
import type { AuthUser }    from '@ifmio/shared-types'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard overview — KPI + alerty + recent' })
  getOverview(@CurrentUser() user: AuthUser) {
    return this.service.getOverview(user)
  }

  @Get('operational')
  @ApiOperation({ summary: 'Provozní dashboard — role-aware operational overview' })
  getOperational(@CurrentUser() user: AuthUser) {
    return this.service.getOperationalDashboard(user)
  }

  @Get('badges')
  @ApiOperation({ summary: 'Sidebar badge counts — single query for all nav badges' })
  getBadges(@CurrentUser() user: AuthUser) {
    return this.service.getBadges(user)
  }
}
