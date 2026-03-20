import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { TransferService } from './transfer.service';
import { UnitsController } from './units.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [UnitsService, TransferService],
  controllers: [UnitsController],
  exports: [UnitsService],
})
export class UnitsModule {}
