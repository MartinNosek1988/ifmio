import { Module }          from '@nestjs/common'
import { AdminService }    from './admin.service'
import { AdminController } from './admin.controller'
import { SecurityDashboardService } from './security-dashboard.service'
import { SecurityDashboardController } from './security-dashboard.controller'

@Module({
  providers:   [AdminService, SecurityDashboardService],
  controllers: [AdminController, SecurityDashboardController],
  exports:     [AdminService],
})
export class AdminModule {}
