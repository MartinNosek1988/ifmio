import { Module } from '@nestjs/common'
import { MioController } from './mio.controller'
import { MioService } from './mio.service'

@Module({
  controllers: [MioController],
  providers: [MioService],
})
export class MioModule {}
