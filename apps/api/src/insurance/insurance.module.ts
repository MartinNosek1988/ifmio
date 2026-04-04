import { Module } from '@nestjs/common'
import { InsuranceController } from './insurance.controller'
import { InsuranceService } from './insurance.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
})
export class InsuranceModule {}
