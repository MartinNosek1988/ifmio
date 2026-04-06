import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { SuperAdminModule } from '../../super-admin/super-admin.module'
import { DataorService } from './dataor.service'
import { DataorAdminController } from './dataor-admin.controller'

@Module({
  imports: [PrismaModule, SuperAdminModule],
  controllers: [DataorAdminController],
  providers: [DataorService],
  exports: [DataorService],
})
export class DataorModule {}
