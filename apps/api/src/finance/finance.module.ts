import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { FinanceController } from './finance.controller';
import { MatchingService } from './matching/matching.service';
import { MatchingController } from './matching/matching.controller';
import { PrescriptionCalcService } from './calc/prescription-calc.service';
import { PrescriptionCalcController } from './calc/prescription-calc.controller';
import { ComponentsModule } from './components/components.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { KontoModule } from '../konto/konto.module';
import { EmailModule } from '../email/email.module';
import { PdfModule } from '../pdf/pdf.module';
import { LocalStorageProvider } from '../documents/storage/local.storage';
import { AiBatchService } from './ai-batch.service';
import { TrainingDataService } from './training-data.service';

@Module({
  imports: [PrismaModule, PropertyScopeModule, KontoModule, ComponentsModule, EmailModule, PdfModule],
  providers: [FinanceService, InvoicesService, MatchingService, PrescriptionCalcService, LocalStorageProvider, AiBatchService, TrainingDataService],
  controllers: [FinanceController, MatchingController, PrescriptionCalcController],
  exports: [FinanceService, InvoicesService, MatchingService, AiBatchService, TrainingDataService],
})
export class FinanceModule {}
