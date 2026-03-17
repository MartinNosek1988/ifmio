import { Module } from '@nestjs/common'
import { ManagementContractController } from './management-contract.controller'
import { ManagementContractService } from './management-contract.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ManagementContractController],
  providers: [ManagementContractService],
  exports: [ManagementContractService],
})
export class ManagementContractModule {}
