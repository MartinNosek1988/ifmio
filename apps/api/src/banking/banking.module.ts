import { Module } from '@nestjs/common'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { FioProvider } from './fio.provider'
import { CryptoService } from '../common/crypto.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [BankingController],
  providers: [BankingService, FioProvider, CryptoService],
  exports: [BankingService],
})
export class BankingModule {}
