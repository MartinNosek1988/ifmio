import { Module } from '@nestjs/common'
import { KontoService } from './konto.service'
import { KontoController } from './konto.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [KontoService],
  controllers: [KontoController],
  exports: [KontoService],
})
export class KontoModule {}
