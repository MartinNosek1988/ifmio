import { Module } from '@nestjs/common'
import { ContractsService } from './contracts.service'
import { ContractsController } from './contracts.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
