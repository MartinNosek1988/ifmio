import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { HelpdeskModule } from '../helpdesk/helpdesk.module';

@Module({
  imports: [HelpdeskModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
