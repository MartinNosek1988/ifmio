import { Module } from '@nestjs/common'
import { CalendarService } from './calendar.service'
import { CalendarController } from './calendar.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService],
})
export class CalendarModule {}
