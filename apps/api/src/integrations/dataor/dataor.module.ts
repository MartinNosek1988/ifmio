import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { DataorService } from './dataor.service'
import { DataorAdminController } from './dataor-admin.controller'

@Module({
  imports: [PrismaModule],
  controllers: [DataorAdminController],
  providers: [DataorService],
  exports: [DataorService],
})
export class DataorModule {}
