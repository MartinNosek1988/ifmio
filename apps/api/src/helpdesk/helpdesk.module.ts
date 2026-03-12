import { Module }             from '@nestjs/common'
import { HelpdeskService }    from './helpdesk.service'
import { HelpdeskController } from './helpdesk.controller'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports:     [PropertyScopeModule],
  providers:   [HelpdeskService],
  controllers: [HelpdeskController],
  exports:     [HelpdeskService],
})
export class HelpdeskModule {}
