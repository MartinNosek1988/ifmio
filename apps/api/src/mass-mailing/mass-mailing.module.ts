import { Module } from '@nestjs/common'
import { MassMailingService } from './mass-mailing.service'
import { MassMailingController } from './mass-mailing.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [MassMailingService],
  controllers: [MassMailingController],
  exports: [MassMailingService],
})
export class MassMailingModule {}
