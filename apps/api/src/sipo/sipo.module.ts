import { Module } from '@nestjs/common'
import { SipoService } from './sipo.service'
import { SipoController } from './sipo.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { KontoModule } from '../konto/konto.module'

@Module({
  imports: [PrismaModule, KontoModule],
  controllers: [SipoController],
  providers: [SipoService],
  exports: [SipoService],
})
export class SipoModule {}
