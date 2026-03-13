import { Module } from '@nestjs/common'
import { ProtocolsController } from './protocols.controller'
import { ProtocolsService } from './protocols.service'
import { PdfModule } from '../pdf/pdf.module'
import { DocumentsModule } from '../documents/documents.module'

@Module({
  imports: [PdfModule, DocumentsModule],
  controllers: [ProtocolsController],
  providers: [ProtocolsService],
  exports: [ProtocolsService],
})
export class ProtocolsModule {}
