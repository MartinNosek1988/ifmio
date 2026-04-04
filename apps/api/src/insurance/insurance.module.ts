import { Module } from '@nestjs/common'
import { InsuranceController } from './insurance.controller'
import { InsuranceService } from './insurance.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
})
export class InsuranceModule {}
