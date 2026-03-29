import { Module } from '@nestjs/common';
import { ChatterController } from './chatter.controller';
import { ChatterService } from './chatter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatterController],
  providers: [ChatterService],
  exports: [ChatterService],
})
export class ChatterModule {}
