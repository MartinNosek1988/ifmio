import { Module } from '@nestjs/common'
import { SettlementController } from './settlement.controller'
import { SettlementService } from './settlement.service'
import { SettlementCalcService } from './settlement-calc.service'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [SettlementController],
  providers: [SettlementService, SettlementCalcService],
  exports: [SettlementService],
})
export class SettlementModule {}
