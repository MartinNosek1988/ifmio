import { Module } from '@nestjs/common'
import { PartyController } from './party.controller'
import { PartyService } from './party.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}
