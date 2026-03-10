import { Module } from '@nestjs/common'
import { WorkOrdersService } from './work-orders.service'
import { WorkOrdersController } from './work-orders.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
