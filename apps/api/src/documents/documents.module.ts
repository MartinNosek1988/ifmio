import { Module }               from '@nestjs/common'
import { DocumentsService }     from './documents.service'
import { DocumentsController }  from './documents.controller'
import { LocalStorageProvider } from './storage/local.storage'
import { ScannerService }      from './scanner/scanner.service'

@Module({
  providers:   [DocumentsService, LocalStorageProvider, ScannerService],
  controllers: [DocumentsController],
  exports:     [DocumentsService],
})
export class DocumentsModule {}
