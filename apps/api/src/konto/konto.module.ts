import { Module } from '@nestjs/common'
import { KontoService } from './konto.service'
import { KontoController } from './konto.controller'
import { KontoRemindersService } from './konto-reminders.service'
import { KontoRemindersController } from './konto-reminders.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [KontoService, KontoRemindersService],
  controllers: [KontoController, KontoRemindersController],
  exports: [KontoService, KontoRemindersService],
})
export class KontoModule {}
