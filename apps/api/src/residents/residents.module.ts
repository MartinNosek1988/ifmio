import { Module } from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { ResidentsController } from './residents.controller';
import { ResidentsImportService } from './import/residents-import.service';
import { ResidentsImportController } from './import/residents-import.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ResidentsService, ResidentsImportService],
  controllers: [ResidentsController, ResidentsImportController],
  exports: [ResidentsService],
})
export class ResidentsModule {}
