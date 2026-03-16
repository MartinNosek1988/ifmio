import { Module } from '@nestjs/common'
import { DebtorsService } from './debtors.service'
import { DebtorsController } from './debtors.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { KontoModule } from '../konto/konto.module'

@Module({
  imports: [PrismaModule, KontoModule],
  providers: [DebtorsService],
  controllers: [DebtorsController],
  exports: [DebtorsService],
})
export class DebtorsModule {}
