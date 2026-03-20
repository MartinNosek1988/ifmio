import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { FinanceController } from './finance.controller';
import { PrescriptionCalcService } from './calc/prescription-calc.service';
import { PrescriptionCalcController } from './calc/prescription-calc.controller';
import { ComponentsModule } from './components/components.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { KontoModule } from '../konto/konto.module';
import { EmailModule } from '../email/email.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule, KontoModule, ComponentsModule, EmailModule, PdfModule],
  providers: [FinanceService, InvoicesService, PrescriptionCalcService],
  controllers: [FinanceController, PrescriptionCalcController],
  exports: [FinanceService, InvoicesService],
})
export class FinanceModule {}
