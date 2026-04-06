import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { JusticeService } from './justice.service';

@Module({
  imports: [PrismaModule],
  providers: [JusticeService],
  exports: [JusticeService],
})
export class JusticeModule {}
