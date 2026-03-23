import { Module } from '@nestjs/common'
import { InitialBalancesService } from './initial-balances.service'
import { InitialBalancesController } from './initial-balances.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { KontoModule } from '../konto/konto.module'

@Module({
  imports: [PrismaModule, KontoModule],
  providers: [InitialBalancesService],
  controllers: [InitialBalancesController],
  exports: [InitialBalancesService],
})
export class InitialBalancesModule {}
