import { Module } from '@nestjs/common'
import { AccountingExportService } from './accounting-export.service'
import { AccountingExportController } from './accounting-export.controller'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PropertyScopeModule],
  controllers: [AccountingExportController],
  providers: [AccountingExportService],
  exports: [AccountingExportService],
})
export class AccountingModule {}
