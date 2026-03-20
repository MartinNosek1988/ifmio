import { Module }          from '@nestjs/common'
import { AdminService }    from './admin.service'
import { AdminController } from './admin.controller'
import { SecurityDashboardService } from './security-dashboard.service'
import { SecurityDashboardController } from './security-dashboard.controller'
import { GdprService } from './gdpr/gdpr.service'
import { GdprController } from './gdpr/gdpr.controller'
import { OffboardingService } from './offboarding.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports:     [AuthModule],
  providers:   [AdminService, SecurityDashboardService, GdprService, OffboardingService],
  controllers: [AdminController, SecurityDashboardController, GdprController],
  exports:     [AdminService, OffboardingService],
})
export class AdminModule {}
