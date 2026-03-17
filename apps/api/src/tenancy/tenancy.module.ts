import { Module } from '@nestjs/common'
import { TenancyController } from './tenancy.controller'
import { TenancyService } from './tenancy.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
