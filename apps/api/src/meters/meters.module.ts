import { Module } from '@nestjs/common'
import { MetersService } from './meters.service'
import { MetersController } from './meters.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [MetersService],
  controllers: [MetersController],
  exports: [MetersService],
})
export class MetersModule {}
