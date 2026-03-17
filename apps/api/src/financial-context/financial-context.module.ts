import { Module } from '@nestjs/common'
import { FinancialContextController } from './financial-context.controller'
import { FinancialContextService } from './financial-context.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [FinancialContextController],
  providers: [FinancialContextService],
  exports: [FinancialContextService],
})
export class FinancialContextModule {}
