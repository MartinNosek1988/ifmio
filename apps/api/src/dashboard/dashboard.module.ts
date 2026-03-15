import { Module }               from '@nestjs/common'
import { DashboardService }     from './dashboard.service'
import { DashboardController }  from './dashboard.controller'
import { PrismaModule }         from '../prisma/prisma.module'
import { PropertyScopeModule }  from '../common/services/property-scope.module'

@Module({
  imports:     [PrismaModule, PropertyScopeModule],
  providers:   [DashboardService],
  controllers: [DashboardController],
  exports:     [DashboardService],
})
export class DashboardModule {}
