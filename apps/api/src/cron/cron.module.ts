import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { HelpdeskModule } from '../helpdesk/helpdesk.module';
import { RevisionsModule } from '../revisions/revisions.module';
import { ReportsModule } from '../reports/reports.module';
import { RecurringPlansModule } from '../recurring-plans/recurring-plans.module';

@Module({
  imports: [HelpdeskModule, RevisionsModule, ReportsModule, RecurringPlansModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
