import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { TransferService } from './transfer.service';
import { UnitDetailService } from './unit-detail.service';
import { UnitsController } from './units.controller';
import { UnitDetailController } from './unit-detail.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [UnitsService, TransferService, UnitDetailService],
  controllers: [UnitsController, UnitDetailController],
  exports: [UnitsService],
})
export class UnitsModule {}
