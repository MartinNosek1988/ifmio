import { Module } from '@nestjs/common'
import { RevisionsService } from './revisions.service'
import { RevisionEscalationService } from './revision-escalation.service'
import { RevisionsController } from './revisions.controller'
import { PropertyScopeModule } from '../common/services/property-scope.module'
import { ProtocolsModule } from '../protocols/protocols.module'

@Module({
  imports: [PropertyScopeModule, ProtocolsModule],
  providers: [RevisionsService, RevisionEscalationService],
  controllers: [RevisionsController],
  exports: [RevisionsService, RevisionEscalationService],
})
export class RevisionsModule {}
