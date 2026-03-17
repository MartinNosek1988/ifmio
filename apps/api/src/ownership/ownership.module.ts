import { Module } from '@nestjs/common'
import { OwnershipController } from './ownership.controller'
import { OwnershipService } from './ownership.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [OwnershipController],
  providers: [OwnershipService],
  exports: [OwnershipService],
})
export class OwnershipModule {}
