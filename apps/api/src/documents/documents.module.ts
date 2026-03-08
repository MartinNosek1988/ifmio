import { Module }               from '@nestjs/common'
import { DocumentsService }     from './documents.service'
import { DocumentsController }  from './documents.controller'
import { LocalStorageProvider } from './storage/local.storage'

@Module({
  providers:   [DocumentsService, LocalStorageProvider],
  controllers: [DocumentsController],
  exports:     [DocumentsService],
})
export class DocumentsModule {}
