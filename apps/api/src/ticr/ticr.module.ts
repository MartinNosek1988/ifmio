import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicrParserService } from './ticr-parser.service';
import { TicrImportService } from './ticr-import.service';
import { TicrController } from './ticr.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TicrController],
  providers: [TicrParserService, TicrImportService],
  exports: [TicrImportService],
})
export class TicrModule {}
