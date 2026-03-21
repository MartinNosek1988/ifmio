import { Module } from '@nestjs/common'
import { AssembliesController } from './assemblies.controller'
import { AssembliesService } from './assemblies.service'
import { AssemblyPdfService } from './pdf/assembly-pdf.service'

@Module({
  controllers: [AssembliesController],
  providers: [AssembliesService, AssemblyPdfService],
  exports: [AssembliesService],
})
export class AssembliesModule {}
