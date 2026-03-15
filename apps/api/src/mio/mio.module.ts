import { Module } from '@nestjs/common'
import { MioController } from './mio.controller'
import { MioService } from './mio.service'
import { MioFindingsService } from './mio-findings.service'
import { HelpdeskModule } from '../helpdesk/helpdesk.module'
import { WorkOrdersModule } from '../work-orders/work-orders.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { RecurringPlansModule } from '../recurring-plans/recurring-plans.module'
import { CalendarModule } from '../calendar/calendar.module'
import { ProtocolsModule } from '../protocols/protocols.module'
import { AssetsModule } from '../assets/assets.module'

@Module({
  imports: [
    HelpdeskModule, WorkOrdersModule, DashboardModule, RecurringPlansModule,
    CalendarModule, ProtocolsModule, AssetsModule,
  ],
  controllers: [MioController],
  providers: [MioService, MioFindingsService],
  exports: [MioFindingsService],
})
export class MioModule {}
