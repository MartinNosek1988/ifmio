import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { TransferService } from './transfer.service';
import { UnitDetailService } from './unit-detail.service';
import { UnitsController } from './units.controller';
import { UnitDetailController } from './unit-detail.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule, KnowledgeBaseModule],
  providers: [UnitsService, TransferService, UnitDetailService],
  controllers: [UnitsController, UnitDetailController],
  exports: [UnitsService],
})
export class UnitsModule {}
