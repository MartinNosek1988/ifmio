import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  controllers: [ReportsController],
  providers: [ReportsService, ScheduledReportsService],
  exports: [ScheduledReportsService],
})
export class ReportsModule {}
