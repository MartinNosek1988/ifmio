import { Module } from '@nestjs/common'
import { WorkOrdersService } from './work-orders.service'
import { WorkOrdersController, HelpdeskWorkOrderController } from './work-orders.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController, HelpdeskWorkOrderController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
