import { Module } from '@nestjs/common'
import { AssembliesController } from './assemblies.controller'
import { AssembliesService } from './assemblies.service'
import { AssemblyPdfService } from './pdf/assembly-pdf.service'
import { VotingGateway } from './voting.gateway'
import { HardwareVotingService } from './hardware-voting.service'
import { HardwareVotingController } from './hardware-voting.controller'

@Module({
  controllers: [AssembliesController, HardwareVotingController],
  providers: [AssembliesService, AssemblyPdfService, VotingGateway, HardwareVotingService],
  exports: [AssembliesService, VotingGateway],
})
export class AssembliesModule {}
