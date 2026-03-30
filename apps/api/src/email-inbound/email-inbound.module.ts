import { Module } from '@nestjs/common';
import { EmailInboundService } from './email-inbound.service';
import { EmailInboundController } from './email-inbound.controller';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  providers: [EmailInboundService],
  controllers: [EmailInboundController],
  exports: [EmailInboundService],
})
export class EmailInboundModule {}
