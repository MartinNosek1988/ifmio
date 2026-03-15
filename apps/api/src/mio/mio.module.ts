import { Module } from '@nestjs/common'
import { MioController } from './mio.controller'
import { MioService } from './mio.service'
import { HelpdeskModule } from '../helpdesk/helpdesk.module'
import { WorkOrdersModule } from '../work-orders/work-orders.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { RecurringPlansModule } from '../recurring-plans/recurring-plans.module'

@Module({
  imports: [HelpdeskModule, WorkOrdersModule, DashboardModule, RecurringPlansModule],
  controllers: [MioController],
  providers: [MioService],
})
export class MioModule {}
