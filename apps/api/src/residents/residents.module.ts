import { Module, forwardRef } from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { ResidentsController } from './residents.controller';
import { ResidentsImportService } from './import/residents-import.service';
import { ResidentsImportController } from './import/residents-import.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FinanceModule)],
  providers: [ResidentsService, ResidentsImportService],
  controllers: [ResidentsController, ResidentsImportController],
  exports: [ResidentsService],
})
export class ResidentsModule {}
