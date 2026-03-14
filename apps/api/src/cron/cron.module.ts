import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { HelpdeskModule } from '../helpdesk/helpdesk.module';
import { RevisionsModule } from '../revisions/revisions.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [HelpdeskModule, RevisionsModule, ReportsModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
