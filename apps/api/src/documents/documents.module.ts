import { Module }               from '@nestjs/common'
import { DocumentsService }     from './documents.service'
import { DocumentsController }  from './documents.controller'
import { LocalStorageProvider } from './storage/local.storage'
import { ScannerService }      from './scanner/scanner.service'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports:     [PropertyScopeModule],
  providers:   [DocumentsService, LocalStorageProvider, ScannerService],
  controllers: [DocumentsController],
  exports:     [DocumentsService],
})
export class DocumentsModule {}
