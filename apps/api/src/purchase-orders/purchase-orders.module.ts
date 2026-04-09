import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  PurchaseOrdersController,
  WorkOrderPurchaseOrderController,
  HelpdeskPurchaseOrderController,
} from './purchase-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule, EmailModule],
  providers: [PurchaseOrdersService],
  controllers: [
    PurchaseOrdersController,
    WorkOrderPurchaseOrderController,
    HelpdeskPurchaseOrderController,
  ],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
