import { Module } from '@nestjs/common';
import { FundOpravController } from './fund-oprav.controller';
import { FundOpravService } from './fund-oprav.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ComponentsModule } from '../finance/components/components.module';

@Module({
  imports: [PrismaModule, ComponentsModule],
  controllers: [FundOpravController],
  providers: [FundOpravService],
  exports: [FundOpravService],
})
export class FundOpravModule {}
