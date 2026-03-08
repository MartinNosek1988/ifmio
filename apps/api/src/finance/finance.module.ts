import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrescriptionCalcService } from './calc/prescription-calc.service';
import { PrescriptionCalcController } from './calc/prescription-calc.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FinanceService, PrescriptionCalcService],
  controllers: [FinanceController, PrescriptionCalcController],
  exports: [FinanceService],
})
export class FinanceModule {}
