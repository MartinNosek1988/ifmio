import { Module } from '@nestjs/common'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { FioProvider } from './fio.provider'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [BankingController],
  providers: [BankingService, FioProvider],
  exports: [BankingService],
})
export class BankingModule {}
