import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { RetentionService } from './retention.service';
import { HelpdeskModule } from '../helpdesk/helpdesk.module';
import { RevisionsModule } from '../revisions/revisions.module';
import { ReportsModule } from '../reports/reports.module';
import { RecurringPlansModule } from '../recurring-plans/recurring-plans.module';
import { MioModule } from '../mio/mio.module';
import { BankingModule } from '../banking/banking.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [HelpdeskModule, RevisionsModule, ReportsModule, RecurringPlansModule, MioModule, BankingModule, WhatsAppModule, FinanceModule],
  providers: [CronService, RetentionService],
  exports: [CronService],
})
export class CronModule {}
