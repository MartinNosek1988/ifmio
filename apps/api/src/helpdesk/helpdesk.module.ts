import { Module }             from '@nestjs/common'
import { HelpdeskService }    from './helpdesk.service'
import { HelpdeskEscalationService } from './helpdesk-escalation.service'
import { SlaPolicyService }   from './sla-policy.service'
import { HelpdeskController } from './helpdesk.controller'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports:     [PropertyScopeModule],
  providers:   [HelpdeskService, HelpdeskEscalationService, SlaPolicyService],
  controllers: [HelpdeskController],
  exports:     [HelpdeskService, HelpdeskEscalationService, SlaPolicyService],
})
export class HelpdeskModule {}
