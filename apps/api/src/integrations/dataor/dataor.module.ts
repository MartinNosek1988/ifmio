import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { DataorService } from './dataor.service'

@Module({
  imports: [PrismaModule],
  providers: [DataorService],
  exports: [DataorService],
})
export class DataorModule {}
