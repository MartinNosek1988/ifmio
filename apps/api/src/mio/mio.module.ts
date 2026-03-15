import { Module } from '@nestjs/common'
import { MioController } from './mio.controller'
import { MioService } from './mio.service'
import { MioFindingsService } from './mio-findings.service'
import { MioConfigService } from './mio-config.service'
import { MioDigestService } from './mio-digest.service'
import { MioObservabilityService } from './mio-observability.service'
import { MioWebhookService } from './mio-webhook.service'
import { HelpdeskModule } from '../helpdesk/helpdesk.module'
import { WorkOrdersModule } from '../work-orders/work-orders.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { RecurringPlansModule } from '../recurring-plans/recurring-plans.module'
import { CalendarModule } from '../calendar/calendar.module'
import { ProtocolsModule } from '../protocols/protocols.module'
import { AssetsModule } from '../assets/assets.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [
    HelpdeskModule, WorkOrdersModule, DashboardModule, RecurringPlansModule,
    CalendarModule, ProtocolsModule, AssetsModule, PropertyScopeModule,
  ],
  controllers: [MioController],
  providers: [MioService, MioFindingsService, MioConfigService, MioDigestService, MioObservabilityService, MioWebhookService],
  exports: [MioFindingsService, MioConfigService, MioDigestService, MioObservabilityService, MioWebhookService],
})
export class MioModule {}
