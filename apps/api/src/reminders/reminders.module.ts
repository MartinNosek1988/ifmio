import { Module }               from '@nestjs/common'
import { RemindersService }     from './reminders.service'
import { RemindersController }  from './reminders.controller'
import { PropertyScopeModule }  from '../common/services/property-scope.module'

@Module({
  imports:     [PropertyScopeModule],
  providers:   [RemindersService],
  controllers: [RemindersController],
  exports:     [RemindersService],
})
export class RemindersModule {}
