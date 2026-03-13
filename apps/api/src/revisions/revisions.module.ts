import { Module } from '@nestjs/common'
import { RevisionsService } from './revisions.service'
import { RevisionsController } from './revisions.controller'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PropertyScopeModule],
  providers: [RevisionsService],
  controllers: [RevisionsController],
  exports: [RevisionsService],
})
export class RevisionsModule {}
