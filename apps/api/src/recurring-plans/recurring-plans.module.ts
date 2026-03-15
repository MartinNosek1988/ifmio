import { Module } from '@nestjs/common'
import { RecurringPlansController } from './recurring-plans.controller'
import { RecurringPlansService } from './recurring-plans.service'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PropertyScopeModule],
  controllers: [RecurringPlansController],
  providers: [RecurringPlansService],
  exports: [RecurringPlansService],
})
export class RecurringPlansModule {}
