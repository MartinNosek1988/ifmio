import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'
import { ESignController } from './esign.controller'
import { ESignService } from './esign.service'

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ESignController],
  providers: [ESignService],
  exports: [ESignService],
})
export class ESignModule {}
